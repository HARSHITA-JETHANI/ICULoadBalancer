// ─── Shared Socket Singleton ─────────────────────────────────────────────────
// Both DispatchView and AdminDashboard import from here
// so there is never more than one connection per browser tab.
import { io } from "socket.io-client";

export const BACKEND_URL = "http://localhost:3000";

const socket = io(BACKEND_URL, { autoConnect: false });

export default socket;
