// Returned by GET /api/logos and POST /api/logos
export interface ILogo {
    name: string
    width: number
    height: number
    // Why the logo will not fit the header, if it does not
    warnings: string[]
}
