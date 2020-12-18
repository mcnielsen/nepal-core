export const aimsTypeSchematics = {
    "https://alertlogic.com/schematics/aims": {
      definitions: {
        user: {
          type: "object",
          properties: {
            account_id: { type: "string" },
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            active: { type: "boolean" },
            locked: { type: "boolean" },
            version: { type: "number" },
            created: { "$ref": "https://alertlogic.com/schematics/shared#definitions/changestamp" },
            modified: { "$ref": "https://alertlogic.com/schematics/shared#definitions/changestamp" },
          },
          required: [ "account_id", "id", "name", "email", "created", "modified" ]
        },
        account: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            active: { type: "boolean" },
            locked: { type: "boolean" },
            version: { type: "number" },
            accessible_locations: { type: "array", item: "string" },
            default_location: { type: "string" },
            mfa_required: { type: "boolean" },
            created: { "$ref": "https://alertlogic.com/schematics/shared#definitions/changestamp" },
            modified: { "$ref": "https://alertlogic.com/schematics/shared#definitions/changestamp" },
          },
          required: [ "id", "Name", "active", "accessible_locations", "default_location", "created", "modified" ]
        },
        authentication: {
          type: "object",
          properties: {
            user: { "$ref": "#definitions/user" },
            account: { "$ref": "#definitions/account" },
            token: { type: "string" },
            token_expiration: { type: "number" }
          },
          required: [ "user", "account", "token", "token_expiration" ]
        }
      }
    }
};

