export interface IOrganization {
    name: string,
    external_identifier: string,
    soon_threshold_in_min: number,
    night_start_hour: number,
    night_end_hour: number,
    timezone: string,
    low_battery_voltage_cutoff_in_mv: number,
    default_logo: string
}
