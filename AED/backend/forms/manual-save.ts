import { addUserAedDevice } from "../store/aed-store.ts";
import type { AedDevice } from "../store/schema.ts";
import { buildManualRecord, type ManualRecordInput } from "./manual-record.ts";

/** Validates and stores one manual AED record; returns the stored row. */
export function saveManualRecord(input: ManualRecordInput): AedDevice {
	const record = buildManualRecord(input);
	return addUserAedDevice(record, input.createdById);
}
