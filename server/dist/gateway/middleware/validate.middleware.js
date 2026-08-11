"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateBody = void 0;
/**
 * Parses `source` against `schema` and, on success, overwrites it on `req`
 * with the parsed value — zod strips unknown keys by default, so this is
 * what turns off mass assignment for every route it's applied to, not just
 * what rejects malformed input.
 */
function validate(schema, source) {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            res.status(400).json({
                error: 'Invalid request',
                details: result.error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            });
            return;
        }
        req[source] = result.data;
        next();
    };
}
const validateBody = (schema) => validate(schema, 'body');
exports.validateBody = validateBody;
const validateParams = (schema) => validate(schema, 'params');
exports.validateParams = validateParams;
