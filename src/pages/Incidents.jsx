import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import IncidentRow from "../components/incidents/IncidentRow";
import IncidentDetailDialog from "../components/incidents/IncidentDetailDialog";
import { toast } from "sonner";

export default function Incidents() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => appClient.entities.Incident.list("-created_date", 100),
  });

  const deleteIncident = useMutation({
    mutationFn: (incident) => appClient.entities.Incident.delete(incident.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident deleted");
    },
  });

  const resolveIncident = useMutation({
    mutationFn: (incident) =>
      appClient.entities.Incident.update(incident.id, {
        status: "resolved",
        resolved_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident resolved");
    },
  });

  const filtered = incidents.filter((inc) => {
    const matchSearch = !search || 
      inc.worker_name?.toLowerCase().includes(search.toLowerCase()) ||
      inc.department?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (inc.status || "open") === statusFilter;
    const matchSeverity = severityFilter === "all" || (inc.severity || "medium") === severityFilter;
    return matchSearch && matchStatus && matchSeverity;
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Incidents" subtitle={`${incidents.length} total incidents recorded`} />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search worker or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Worker</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Missing Gear</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</td>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">No incidents found</td>
                </TableRow>
              ) : (
                filtered.map((inc) => (
                  <IncidentRow
                    key={inc.id}
                    incident={inc}
                    onResolve={(inc) => resolveIncident.mutate(inc)}
                    onView={(inc) => setSelectedIncident(inc)}
                    onDelete={(inc) => deleteIncident.mutate(inc)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <IncidentDetailDialog
        incident={selectedIncident}
        open={!!selectedIncident}
        onOpenChange={(open) => !open && setSelectedIncident(null)}
      />
    </div>
  );
}