// Parameter rows in the Edit Test form need a stable key so their inputs stay
// attached to them when they are moved. The key is never sent to the server.
let lastKey = 0;
export const newParameterKey = () => `param-${++lastKey}`;
export const withParameterKeys = (parameters = []) =>
    parameters.map((parameter) => ({ ...parameter, _key: parameter._key || newParameterKey() }));
export const withoutParameterKeys = (parameters = []) =>
    parameters.map(({ _key, ...parameter }) => parameter);
