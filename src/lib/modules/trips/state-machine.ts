import { AppError } from "@/lib/errors/app-error";
import { TripStatus } from "@prisma/client";

const transitions: Record<TripStatus, TripStatus[]> = {
  requested: ["assigned", "cancelled"],
  assigned: ["accepted", "cancelled"],
  accepted: ["arrived", "cancelled"],
  arrived: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export function assertValidTransition(current: TripStatus, next: TripStatus) {
  if (!transitions[current].includes(next)) {
    throw new AppError(`Invalid trip transition: ${current} -> ${next}`, 409, "invalid_trip_transition");
  }
}
