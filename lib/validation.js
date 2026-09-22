const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function isUuid(value){return typeof value==='string'&&UUID.test(value)}
export function isPositiveInt(value){const n=Number(value);return Number.isInteger(n)&&n>0}

export function isIsoDate(value){if(value===null||value===undefined||value==='')return true;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value}
