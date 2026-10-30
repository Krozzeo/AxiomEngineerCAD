export function fail(code,message){throw Object.assign(new Error(message),{code});}
export function check(condition,code,message){if(!condition)fail(code,message);}
