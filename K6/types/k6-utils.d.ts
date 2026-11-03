declare module "https://jslib.k6.io/k6-utils/1.6.0/index.js" {
    export function tagWithCurrentStageIndex(): void
    export function tagWithCurrentStageProfile(): void
    export function getCurrentStageIndex(): number
    export function uuidv4(secure?: boolean): string
    export function randomIntBetween(min: number, max: number): number
    export function randomItem<T>(items: T[]): T
}
