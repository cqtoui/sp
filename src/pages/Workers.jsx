// @ts-nocheck

import { useState } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { appClient } from "@/api/appClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  AlertTriangle,
  Plus,
  Search,
} from "lucide-react";

import PasswordConfirmDialog from "../components/auth/PasswordConfirmDialog";
import PageHeader from "../components/layout/PageHeader";
import WorkerCard from "../components/workers/WorkerCard";
import WorkerFormDialog from "../components/workers/WorkerFormDialog";

import { toast } from "sonner";


const BACKEND_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


async function parseBackendResponse(
  response
) {
  let body = {};

  try {
    body =
      await response.json();
  } catch (_) {
    body = {};
  }

  if (!response.ok) {
    throw new Error(
      body.detail ||
        body.message ||
        `Backend request failed with status ${response.status}.`
    );
  }

  return body;
}


function buildBackendFormData(
  form,
  includePhoto = true
) {
  const formData =
    new FormData();

  formData.append(
    "full_name",
    form.full_name
  );

  formData.append(
    "employee_id",
    form.employee_id
  );

  formData.append(
    "department",
    form.department
  );

  formData.append(
    "status",
    form.status || "active"
  );

  formData.append(
    "required_gear",
    JSON.stringify(
      form.required_gear || []
    )
  );

  if (
    includePhoto &&
    form.photo_file
  ) {
    formData.append(
      "photo",
      form.photo_file
    );
  }

  return formData;
}


async function registerWorkerInBackend(
  form
) {
  if (!form.photo_file) {
    throw new Error(
      "A face photo is required for backend registration."
    );
  }

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/workers`,
    {
      method: "POST",
      body: buildBackendFormData(
        form,
        true
      ),
    }
  );

  const body =
    await parseBackendResponse(
      response
    );

  return body.worker;
}


async function updateWorkerInBackend(
  backendWorkerId,
  form
) {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/workers/${backendWorkerId}`,
    {
      method: "PUT",
      body: buildBackendFormData(
        form,
        Boolean(
          form.photo_file
        )
      ),
    }
  );

  const body =
    await parseBackendResponse(
      response
    );

  return body.worker;
}


async function deleteWorkerFromBackend(
  backendWorkerId
) {
  if (!backendWorkerId) {
    return;
  }

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/workers/${backendWorkerId}`,
    {
      method: "DELETE",
    }
  );

  await parseBackendResponse(
    response
  );
}


export default function Workers() {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    dialogOpen,
    setDialogOpen,
  ] = useState(false);

  const [
    editingWorker,
    setEditingWorker,
  ] = useState(null);

  const [
    deletingWorker,
    setDeletingWorker,
  ] = useState(null);

  const [
    passwordDialog,
    setPasswordDialog,
  ] = useState(null);

  const queryClient =
    useQueryClient();


  const {
    data: workers = [],
    isLoading,
  } = useQuery({
    queryKey: ["workers"],

    queryFn: () =>
      appClient.entities.Worker.list(),
  });


  const createWorker =
    useMutation({
      mutationFn:
        async (form) => {
          /*
           * Register in FastAPI first.
           * If that succeeds, save the returned backend ID and permanent
           * photo URL in the frontend database.
           */
          const backendWorker =
            await registerWorkerInBackend(
              form
            );

          try {
            return await appClient.entities.Worker.create(
              {
                full_name:
                  backendWorker.full_name,

                employee_id:
                  backendWorker.employee_id,

                department:
                  backendWorker.department,

                status:
                  backendWorker.status,

                required_gear:
                  backendWorker.required_gear ||
                  form.required_gear ||
                  [],

                photo_url:
                  backendWorker.photo_url,

                backend_worker_id:
                  backendWorker.id,

                compliance_rate: 100,
                total_violations: 0,
              }
            );
          } catch (frontendError) {
            /*
             * Roll back backend registration if the frontend record fails.
             */
            try {
              await deleteWorkerFromBackend(
                backendWorker.id
              );
            } catch (
              rollbackError
            ) {
              console.error(
                "Backend rollback failed:",
                rollbackError
              );
            }

            throw frontendError;
          }
        },

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["workers"],
        });

        setDialogOpen(false);
        setEditingWorker(null);

        toast.success(
          "Worker registered in the website and facial-recognition backend."
        );
      },

      onError: (error) => {
        console.error(
          "Worker creation failed:",
          error
        );

        toast.error(
          error?.message ||
            "Worker registration failed."
        );
      },
    });


  const updateWorker =
    useMutation({
      mutationFn:
        async ({
          worker,
          form,
        }) => {
          let backendWorker;

          /*
           * Legacy frontend records may not yet have backend_worker_id.
           * In that case, create the backend record during this edit.
           */
          if (
            worker.backend_worker_id
          ) {
            backendWorker =
              await updateWorkerInBackend(
                worker.backend_worker_id,
                form
              );
          } else {
            if (
              !form.photo_file
            ) {
              throw new Error(
                "This older worker is not yet registered in FastAPI. Upload a face photo, then save again."
              );
            }

            backendWorker =
              await registerWorkerInBackend(
                form
              );
          }

          return appClient.entities.Worker.update(
            worker.id,
            {
              full_name:
                backendWorker.full_name,

              employee_id:
                backendWorker.employee_id,

              department:
                backendWorker.department,

              status:
                backendWorker.status,

              required_gear:
                backendWorker.required_gear ||
                form.required_gear ||
                [],

              photo_url:
                backendWorker.photo_url,

              backend_worker_id:
                backendWorker.id,
            }
          );
        },

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["workers"],
        });

        setDialogOpen(false);
        setEditingWorker(null);

        toast.success(
          "Worker updated in the frontend and backend."
        );
      },

      onError: (error) => {
        console.error(
          "Worker update failed:",
          error
        );

        toast.error(
          error?.message ||
            "Worker update failed."
        );
      },
    });


  const deleteWorker =
    useMutation({
      mutationFn:
        async (worker) => {
          await deleteWorkerFromBackend(
            worker.backend_worker_id
          );

          return appClient.entities.Worker.delete(
            worker.id
          );
        },

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["workers"],
        });

        setDeletingWorker(null);

        toast.success(
          "Worker deleted from the frontend and backend."
        );
      },

      onError: (error) => {
        console.error(
          "Worker deletion failed:",
          error
        );

        toast.error(
          error?.message ||
            "Worker deletion failed."
        );
      },
    });


  const handleSave = (
    form
  ) => {
    if (editingWorker) {
      updateWorker.mutate({
        worker:
          editingWorker,
        form,
      });
    } else {
      createWorker.mutate(
        form
      );
    }
  };


  const filteredWorkers =
    workers.filter(
      (worker) => {
        if (!search) {
          return true;
        }

        const query =
          search.toLowerCase();

        return (
          String(
            worker.full_name ||
              ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            worker.employee_id ||
              ""
          )
            .toLowerCase()
            .includes(query)
        );
      }
    );


  const missingPhotoCount =
    workers.filter(
      (worker) =>
        !worker.photo_url
    ).length;


  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Workers"
        subtitle={`${workers.length} registered workers`}
      >
        <Button
          onClick={() => {
            setEditingWorker(
              null
            );

            setDialogOpen(
              true
            );
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Worker
        </Button>
      </PageHeader>

      {missingPhotoCount > 0 && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />

          <span>
            <strong>
              {missingPhotoCount} worker(s)
            </strong>{" "}
            have no permanent face
            photo. Edit them and
            upload a new photograph.
          </span>
        </div>
      )}

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

        <Input
          placeholder="Search workers..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading workers...
        </div>
      ) : filteredWorkers.length ===
        0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search
            ? "No workers match your search."
            : "No workers registered yet. Add your first worker."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredWorkers.map(
            (worker) => (
              <WorkerCard
                key={
                  worker.id
                }
                worker={
                  worker
                }
                onEdit={(
                  selectedWorker
                ) =>
                  setPasswordDialog(
                    {
                      type: "edit",
                      worker:
                        selectedWorker,
                    }
                  )
                }
                onDelete={(
                  selectedWorker
                ) =>
                  setPasswordDialog(
                    {
                      type: "delete",
                      worker:
                        selectedWorker,
                    }
                  )
                }
              />
            )
          )}
        </div>
      )}

      <AlertDialog
        open={
          Boolean(
            deletingWorker
          )
        }
        onOpenChange={(
          isOpen
        ) => {
          if (!isOpen) {
            setDeletingWorker(
              null
            );
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Worker
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you
              want to remove{" "}
              <strong>
                {
                  deletingWorker?.full_name
                }
              </strong>{" "}
              from the frontend
              and facial-recognition
              backend?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (
                  deletingWorker
                ) {
                  deleteWorker.mutate(
                    deletingWorker
                  );
                }
              }}
              disabled={
                deleteWorker.isPending
              }
            >
              Delete Worker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WorkerFormDialog
        worker={
          editingWorker
        }
        open={
          dialogOpen
        }
        onOpenChange={(
          isOpen
        ) => {
          setDialogOpen(
            isOpen
          );

          if (!isOpen) {
            setEditingWorker(
              null
            );
          }
        }}
        onSave={
          handleSave
        }
        saving={
          createWorker.isPending ||
          updateWorker.isPending
        }
      />

      <PasswordConfirmDialog
        open={
          Boolean(
            passwordDialog
          )
        }
        onOpenChange={(
          isOpen
        ) => {
          if (!isOpen) {
            setPasswordDialog(
              null
            );
          }
        }}
        title={
          passwordDialog?.type ===
          "edit"
            ? "Admin Verification — Edit Worker"
            : "Admin Verification — Delete Worker"
        }
        description={
          passwordDialog?.type ===
          "edit"
            ? "Enter the admin password to edit this worker."
            : "Enter the admin password to delete this worker."
        }
        confirmLabel="Unlock"
        destructive={
          passwordDialog?.type ===
          "delete"
        }
        onConfirm={() => {
          if (
            passwordDialog?.type ===
            "edit"
          ) {
            setEditingWorker(
              passwordDialog.worker
            );

            setDialogOpen(
              true
            );
          } else {
            setDeletingWorker(
              passwordDialog?.worker
            );
          }

          setPasswordDialog(
            null
          );
        }}
      />
    </div>
  );
}