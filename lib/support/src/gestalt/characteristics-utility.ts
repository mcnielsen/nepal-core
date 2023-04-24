import {
    AlCardstackPropertyDescriptor,
    AlCardstackValueDescriptor,
    AlEntitlementCollection,
    AlExecutionContext,
    client, Subscriptions,
} from "@al/core";
import sortBy from 'lodash-es/sortBy';

export class CharacteristicsUtility {

    public static getCaptionDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: 'caption',
            caption: 'Name',
            captionPlural: '',
            values: [],
        };
    }

    public static getAccountsDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'aims',
            metadata: {},
            property: 'accounts',
            caption: 'Account',
            captionPlural: 'Accounts',
            values: [],
        };
    }

    public static getAccountIdDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'aims',
            metadata: {},
            property: 'accountId',
            caption: 'Account',
            captionPlural: 'Accounts',
            values: [],
        };
    }

    public static getRecipientDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: 'recipients',
            caption: 'Recipient',
            captionPlural: 'Recipients',
            values: [],
        };
    }

    public static getUsersDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'aims',
            metadata: {},
            property: 'users',
            caption: 'Subscribed User',
            captionPlural: 'Users',
            values: [],
        };
    }

    public static getIntegrationsDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'aims',
            metadata: {},
            property: 'integrations',
            caption: AlExecutionContext.environment === 'integration' ? 'Subscribed Templated Connection' : 'Subscribed Connector',
            captionPlural: 'Integrations',
            values: [],
        };
    }

    public static getWorkbookSubMenuDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'tacoma',
            metadata: {},
            property: 'workbookSubMenu',
            caption: 'Report Group',
            captionPlural: 'Report Groups',
            values: [],
        };
    }

    public static getWorkbookBySubMenuDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'tacoma',
            metadata: {},
            property: 'workbookBySubMenu',
            caption: '',
            captionPlural: '',
            values: [],
        };
    }

    public static getWorkbookIdDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'tacoma',
            metadata: {},
            property: "workbookId",
            caption: "Category",
            captionPlural: "Categories",
            values: []
        };
    }

    public static getViewIdDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'tacoma',
            metadata: {},
            property: "viewId",
            caption: "Subcategory",
            captionPlural: "Subcategories",
            values: []
        };
    }

    public static getSearchableDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: "searchables",
            caption: "Searchables",
            captionPlural: "",
            values: []
        };
    }

    public static getScheduleCadenceDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: "cadenceName",
            caption: "Scheduling Cadence",
            captionPlural: "Scheduling Cadence",
            values: []
        };
    }

    public static getScheduleNameDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'cargo',
            metadata: {},
            property: "scheduleName",
            caption: "Schedule",
            captionPlural: "Schedules",
            values: [],
            remote: true
        };
    }

    public static getDisplayDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: "display",
            caption: "Display",
            captionPlural: "Display",
            values: [],
            remote: true
        };
    }

    public static getCreatedTimeDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: 'createdTime',
            caption: 'Create Time',
            captionPlural: '',
            values: [],
            multiSelect: false,
        };
    }

    public static getModifiedTimeDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: 'modifiedTime',
            caption: 'Updated Time',
            captionPlural: '',
            values: [],
            multiSelect: false,
        };
    }

    public static getNotificationType(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: 'notificationType',
            caption: 'Type',
            captionPlural: 'Types',
            values: [],
            multiSelect: false,
        };
    }

    public static getThreatLevelDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'iris',
            metadata: {},
            property: 'threatLevel',
            caption: 'Threat Level',
            captionPlural: 'Threat Levels',
            values: [],
        };
    }

    public static getEscalatedDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: 'escalated',
            caption: 'Escalation Status',
            captionPlural: 'Escalation Status',
            values: [],
        };
    }

    public static getScheduledTimeDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: 'cargo',
            metadata: {},
            property: 'scheduledTime',
            caption: 'Date',
            captionPlural: '',
            values: [],
            remote: true
        };
    }

    public static getDeploymentsDefinition(): AlCardstackPropertyDescriptor {
        return {
            domain: '',
            metadata: {},
            property: 'deployments',
            caption: 'Deployment',
            captionPlural: 'Deployments',
            values: []
        };
    }

    /**
     * Return display hardcode values
     * @param property
     */
    public static getDisplayValues( property : string ): AlCardstackValueDescriptor[] {
        let list = [];
        list.push({id:'true', name:'Latest Only'});

        return CharacteristicsUtility.processWithIdAndName(list,property);
    }

    /**
     * Return escalated hardcode values
     * @param property
     */
    public static getEscalatedValues( property : string ): AlCardstackValueDescriptor[] {
        let list = [];
        list.push({id:true, name:'Escalated'});
        list.push({id:false, name:'Not Escalated'});
        return CharacteristicsUtility.processWithIdAndName(list, property);
    }

    /**
     * Return posible static values for scheduling cadence
     * @param property
     */
    public static getScheduleCadenceValues( property : string ): AlCardstackValueDescriptor[] {
        let list = [];
        list.push({id:'monthly', name:'Monthly'});
        list.push({id:'weekly', name:'Weekly'});
        list.push({id:'daily', name:'Daily'});
        // list.push({id:'every_15_minutes', name:'Every 15 minutes'}); not sure if we should return this one

        return CharacteristicsUtility.processWithIdAndName(list,property);
    }

     /**
     * Create a property in a dictionary if that does not exists
     * @param dictionary
     * @param key
     * @param name
     */
    public static createPropertyDictionary(dictionary: { [key: string]: {name:string, metadata:unknown} }, key: string, name: string , metadata?: {[property:string]:unknown}) {
        if (!dictionary.hasOwnProperty(key)) {
            dictionary[key] = {
                name: name,
                metadata: metadata};
        }
    }

    /**
     * Create an array of properties from a dictionary key:value
     * @param dictionaryIn
     * @param property
     */
    public static fromDictionaryToAlCardstackValueDescriptor(
        dictionaryIn: { [key: string]: { name: string, metadata: { [property: string]: unknown; } } },
        property: string
    ): AlCardstackValueDescriptor[] {
        const values = Object.keys(dictionaryIn).map(
            (key: string) => {
                const valueDescriptor =  CharacteristicsUtility.createAlCardstackValueDescriptor(
                    {
                        "value": key,
                        "caption": dictionaryIn[key].name,
                        "metadata": dictionaryIn[key].metadata
                    }, property
                );
                return valueDescriptor;
            }
        );

        return this.sortValueDescriptorList(values, 'caption');
    }

    /**
     * create AlCardstackValueDescriptor  from objects with id and name
     */
    public static processWithIdAndName(list: { id?: string | boolean; name?: string }[],
                                       property: string,
                                       type?: string,
    ) {

        let values = list.map((item) => CharacteristicsUtility.createAlCardstackValueDescriptor(
            {
                value: item.id === undefined  ? '' : item.id,
                caption: item.name || '',
                type: type ?? ''
            }, property));

        return this.sortValueDescriptorList(values, 'caption');
    }

    /** sort list by caption */
    public static sortValueDescriptorList<T, K extends keyof T>(values: T[], field:K):T[] {
        return sortBy(values, field);
    }

    /**
     * create a object with the AlCardstackValueDescriptor structure
     */
    public static createAlCardstackValueDescriptor(
        item: { value: string | boolean, caption: string, type?: string, metadata?: { [property: string]: unknown; } },
        property: string
    ): AlCardstackValueDescriptor {
        return {
            property: property,
            captionPlural: '',
            value: item.value,
            count: undefined,
            caption: item.caption,
            valueKey: item.value as string,
            type: item.type ?? undefined,
            metadata: item.metadata ?? undefined
        };
    }

    public static async validateEntitlement(accountId:string, entitlement:string):Promise<boolean>{
        let entitlements:AlEntitlementCollection = await client(Subscriptions).getEntitlements(accountId);
        return entitlements.evaluateExpression(entitlement);
    }
}
