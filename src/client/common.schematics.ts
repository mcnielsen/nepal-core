export const commonTypeSchematics = {
    'https://alertlogic.com/schematics/shared': {
      definitions: {
        changestamp: {
          type: "object",
          properties: {
            by: { type: "string" },
            at: { type: "number" }
          },
          required: [ "by", "at" ],
          additionalProperties: false
        }
      }
    }
};
