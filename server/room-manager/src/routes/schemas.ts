// JSON schemas for the management API bodies. Fastify's Ajv removes properties that are not listed
// (additionalProperties: false) and coerces numbers to strings where a string is expected.

const nonEmptyString = {type: "string", minLength: 1}

const ewsInfo = {
    type: "object",
    additionalProperties: false,
    required: ["email", "tenant_id"],
    properties: {email: nonEmptyString, tenant_id: nonEmptyString},
}

const person = {
    type: "object",
    additionalProperties: false,
    required: ["name", "ews_info"],
    properties: {
        name: nonEmptyString,
        job: {type: "string"},
        group: {type: "string"},
        email: {type: ["string", "null"]},
        phone: {type: ["string", "null"]},
        ews_info: ewsInfo,
    },
}

export const roomBody = {
    type: "object",
    additionalProperties: false,
    required: ["id_string", "name", "logo"],
    properties: {
        room_number: {type: ["integer", "null"]},
        id_string: nonEmptyString,
        name: nonEmptyString,
        logo: nonEmptyString,
        ews_info: {anyOf: [ewsInfo, {type: "null"}]},
        ical_info: {
            anyOf: [{
                type: "object",
                additionalProperties: false,
                required: ["endpoint"],
                properties: {endpoint: nonEmptyString},
            }, {type: "null"}],
        },
        persons: {anyOf: [{type: "array", minItems: 1, maxItems: 2, items: person}, {type: "null"}]},
    },
}

export const MAC_PATTERN = "^[0-9A-Fa-f]{12}$"

const roomReference = {anyOf: [nonEmptyString, {type: "null"}]}

export const deviceCreateBody = {
    type: "object",
    additionalProperties: false,
    required: ["device_id"],
    properties: {
        device_id: {type: "string", pattern: MAC_PATTERN},
        location: {type: "string", default: ""},
        room_id: {...roomReference, default: null},
    },
}

export const deviceUpdateBody = {
    type: "object",
    additionalProperties: false,
    required: ["location", "room_id"],
    properties: {
        location: {type: "string"},
        room_id: roomReference,
    },
}

export const tenantBody = {
    type: "object",
    additionalProperties: false,
    required: ["identifier", "endpoint", "user", "secret"],
    properties: {
        identifier: nonEmptyString,
        endpoint: {type: "string", pattern: "^https?://"},
        user: nonEmptyString,
        // The name of an environment variable, never the password itself
        secret: {type: "string", pattern: "^[A-Za-z_][A-Za-z0-9_]*$"},
    },
}

const hour = {type: "integer", minimum: 0, maximum: 23}

export const organizationBody = {
    type: "object",
    additionalProperties: false,
    required: ["soon_threshold_in_min", "night_start_hour", "night_end_hour", "timezone", "low_battery_voltage_cutoff_in_mv", "default_logo"],
    properties: {
        name: {type: "string", default: ""},
        external_identifier: {type: "string", default: ""},
        soon_threshold_in_min: {type: "integer", minimum: 0, maximum: 24 * 60},
        night_start_hour: hour,
        night_end_hour: hour,
        timezone: nonEmptyString,
        low_battery_voltage_cutoff_in_mv: {type: "integer", minimum: 0, maximum: 5000},
        default_logo: nonEmptyString,
        device_offline_after_min: {type: "integer", minimum: 1, default: 120},
    },
}

export function isUniqueViolation(error: any): boolean {
    return error?.code == "SQLITE_CONSTRAINT_UNIQUE"
}
