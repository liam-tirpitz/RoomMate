import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {getDeviceState, isOffline} from "../src/deviceStatus";
import {IDevice} from "../../datamodels/IDevice";
import {IOrganization} from "../../datamodels/IOrganization";

const NOW = new Date("2026-09-18T12:00:00.000Z")
const ORGANIZATION = {low_battery_voltage_cutoff_in_mv: 3100, device_offline_after_min: 120} as IOrganization

function device(patch: Partial<IDevice>): IDevice {
    return {device_id: "aabbccddeeff", location: "", room_id: "1", last_contact: null, battery_mv: null, ...patch}
}

function minutesAgo(minutes: number): string {
    return new Date(NOW.getTime() - minutes * 60_000).toISOString()
}

describe("device status", () => {
    it("calls a device without a room unconfigured, whatever else is wrong", () => {
        assert.equal(getDeviceState(device({room_id: null, battery_mv: 3000, last_contact: minutesAgo(600)}), ORGANIZATION, NOW), "unconfigured")
    })

    it("does not call a device offline that has never reported", () => {
        assert.equal(isOffline(device({}), 120, NOW), false)
    })

    it("calls a device offline after device_offline_after_min without contact", () => {
        assert.equal(isOffline(device({last_contact: minutesAgo(119)}), 120, NOW), false)
        assert.equal(isOffline(device({last_contact: minutesAgo(121)}), 120, NOW), true)
    })

    it("waits for an announced wake-up, plus a little grace", () => {
        const sleeping = device({last_contact: minutesAgo(600), next_expected_contact: minutesAgo(5)})
        assert.equal(isOffline(sleeping, 120, NOW), false)
        const late = device({last_contact: minutesAgo(600), next_expected_contact: minutesAgo(11)})
        assert.equal(isOffline(late, 120, NOW), true)
    })

    it("prefers offline over low battery, and low battery over ok", () => {
        assert.equal(getDeviceState(device({last_contact: minutesAgo(600), battery_mv: 3000}), ORGANIZATION, NOW), "offline")
        assert.equal(getDeviceState(device({last_contact: minutesAgo(1), battery_mv: 3000}), ORGANIZATION, NOW), "low_battery")
        assert.equal(getDeviceState(device({last_contact: minutesAgo(1), battery_mv: 3900}), ORGANIZATION, NOW), "ok")
    })
})
