import { create } from "zustand";
import axiosInstance from "@/utils/axiosInstance";

interface Location {
  id: string;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
  createdAt: string;
}

interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

interface AdminState {
  locations: Location[];
  users: AdminUser[];
  admins: AdminUser[];
  isLoadingLocations: boolean;
  isLoadingUsers: boolean;
  isLoadingAdmins: boolean;

  loadLocations: () => Promise<void>;
  loadUsers: () => Promise<void>;
  loadAdmins: () => Promise<void>;

  addLocation: (location: Location) => void;
  removeLocation: (id: string) => void;

  addUser: (user: AdminUser) => void;
  removeUser: (id: string) => void;

  addAdmin: (admin: AdminUser) => void;
  removeAdmin: (id: string) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  locations: [],
  users: [],
  admins: [],
  isLoadingLocations: false,
  isLoadingUsers: false,
  isLoadingAdmins: false,

  loadLocations: async () => {
    set({ isLoadingLocations: true });
    try {
      const res = await axiosInstance.get("/admin/locations");
      set({ locations: res.data.locations });
    } catch {
      // silent
    } finally {
      set({ isLoadingLocations: false });
    }
  },

  loadUsers: async () => {
    set({ isLoadingUsers: true });
    try {
      const res = await axiosInstance.get("/admin/users");
      set({ users: res.data.users });
    } catch {
      // silent
    } finally {
      set({ isLoadingUsers: false });
    }
  },

  loadAdmins: async () => {
    set({ isLoadingAdmins: true });
    try {
      const res = await axiosInstance.get("/superadmin/admins");
      set({ admins: res.data.admins });
    } catch {
      // silent
    } finally {
      set({ isLoadingAdmins: false });
    }
  },

  addLocation: (location) =>
    set((state) => ({ locations: [location, ...state.locations] })),

  removeLocation: (id) =>
    set((state) => ({ locations: state.locations.filter((l) => l.id !== id) })),

  addUser: (user) =>
    set((state) => ({ users: [user, ...state.users] })),

  removeUser: (id) =>
    set((state) => ({ users: state.users.filter((u) => u.id !== id) })),

  addAdmin: (admin) =>
    set((state) => ({ admins: [admin, ...state.admins] })),

  removeAdmin: (id) =>
    set((state) => ({ admins: state.admins.filter((a) => a.id !== id) })),
}));
