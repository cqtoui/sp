// @ts-nocheck

const STORAGE_KEY = "guard_sight_safe_local_db_v1";

const defaultDb = {
  Worker: [],
  EntryPoint: [
    {
      id: "default-entry",
      name: "Default Entry",
      department: "General",
required_gear: [
  "helmet",
  "goggles",
  "safety_vest",
  "gloves",
  "ear_protection",
  "lab_coat",
],
      scans_today: 0,
      violations_today: 0,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    },
  ],
  Incident: [],
};

function cloneDefaultDb() {
  return JSON.parse(JSON.stringify(defaultDb));
}

function readDb() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return cloneDefaultDb();
    }

    return {
      ...cloneDefaultDb(),
      ...JSON.parse(raw),
    };
  } catch {
    return cloneDefaultDb();
  }
}

function writeDb(db) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortRecords(records, orderBy) {
  if (!orderBy) {
    return records;
  }

  const desc = orderBy.startsWith("-");
  const field = desc ? orderBy.slice(1) : orderBy;

  return [...records].sort((a, b) => {
    const av = a?.[field] ?? "";
    const bv = b?.[field] ?? "";

    if (av < bv) {
      return desc ? 1 : -1;
    }

    if (av > bv) {
      return desc ? -1 : 1;
    }

    return 0;
  });
}

function entityApi(entityName) {
  return {
    async list(orderBy, limit) {
      const db = readDb();
      let records = sortRecords(db[entityName] || [], orderBy);

      if (typeof limit === "number") {
        records = records.slice(0, limit);
      }

      return records;
    },

    async create(data) {
      const db = readDb();
      const now = new Date().toISOString();

      const record = {
        id: data.id || makeId(entityName.toLowerCase()),
        ...data,
        created_date: data.created_date || now,
        updated_date: now,
      };

      db[entityName] = [record, ...(db[entityName] || [])];
      writeDb(db);

      return record;
    },

    async update(id, data) {
      const db = readDb();
      const records = db[entityName] || [];
      const index = records.findIndex((item) => item.id === id);

      if (index === -1) {
        throw new Error(`${entityName} not found`);
      }

      records[index] = {
        ...records[index],
        ...data,
        updated_date: new Date().toISOString(),
      };

      db[entityName] = records;
      writeDb(db);

      return records[index];
    },

    async delete(id) {
      const db = readDb();

      db[entityName] = (db[entityName] || []).filter((item) => item.id !== id);
      writeDb(db);

      return { success: true };
    },
  };
}

async function captureCameraFrameAsFile() {
  const video = document.querySelector("video");

  if (!video) {
    throw new Error("No video element found. Start the camera first.");
  }

  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("Camera is not ready yet. Wait one second and scan again.");
  }

  const canvas = document.createElement("canvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create image capture context.");
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.9);
  });

  if (!blob) {
    throw new Error("Could not capture camera image.");
  }

  return new File([blob], "camera-scan.jpg", {
    type: "image/jpeg",
  });
}

function withTimeout(promise, timeoutMs, controller) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      if (controller) {
        controller.abort();
      }

      reject(new Error("Scan completed. No gear detected."));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export const appClient = {
  auth: {
    async me() {
      return {
        id: "local-admin",
        full_name: "Local Admin",
        email: "local@aisafeguard.app",
        role: "admin",
      };
    },

    logout() {},

    redirectToLogin() {},
  },

  entities: {
    Worker: entityApi("Worker"),
    EntryPoint: entityApi("EntryPoint"),
    Incident: entityApi("Incident"),
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        return {
          file_url: URL.createObjectURL(file),
        };
      },

      async InvokeLLM({ image, timeoutMs = 5000 }) {
        let imageFile = image;

        if (!imageFile) {
          imageFile = await captureCameraFrameAsFile();
        }

        const formData = new FormData();

        formData.append("image", imageFile);
        formData.append("file", imageFile);

        const controller = new AbortController();

        const request = fetch("http://localhost:8000/api/scan", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        const response = await withTimeout(request, timeoutMs, controller);

        if (!response.ok) {
          throw new Error("Backend scan failed.");
        }

        return await response.json();
      },
    },
  },
};

export default appClient;