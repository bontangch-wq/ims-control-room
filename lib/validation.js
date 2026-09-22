const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function isUuid(value){return typeof value==='string'&&UUID.test(value)}
export function isPositiveInt(value){const n=Number(value);return Number.isInteger(n)&&n>0}
