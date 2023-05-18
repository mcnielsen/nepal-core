import { ALCargoV2 } from "@al/core/reporting";
import {
    client, AIMS,
    AlBadRequestError,
} from '@al/core';
import {
    AlCardstackCharacteristics,
    AlCardstackPropertyDescriptor,
    AlCardstackValueDescriptor,
} from '@al/core/cardstack';
import { AlConnectorsClient } from "@al/core/reporting";
import { AlHeraldClient } from "@al/core/reporting";
import {
    AlIncidentFilterDictionary,
    AlIrisClient,
} from "@al/core/incidents";
import {
    ALTacoma,
    AlTacomaSite,
} from "@al/core/reporting";
import { AlDeploymentsClient } from "@al/core/assets";
import { CharacteristicsUtility } from './characteristics-utility';
import { ListHandler } from './list';
import { AlGenericAlertDefinition } from './types';

export class CharacteristicsHandler {

    constructor(
        private accountId: string,
        private entityType: string,
    ) {
    }

    static handle(accountId: string, entityType: string) {
        const characteristics = new CharacteristicsHandler(accountId, entityType);
        return characteristics.handleInternal();
    }

    private handleInternal(): Promise<AlCardstackCharacteristics> {

        switch (this.entityType) {
            case 'incident':
                return this.incidentAlertCharacteristics();
            case 'scheduled_report':
                return this.scheduledReportCharacteristics();
            case 'manage_alerts':
                return this.manageAlertCharacteristics();
            case 'manage_scheduled':
                return this.manageScheduledCharacteristics();
            case 'artifacts':
                return this.artifactsCharacteristics();
            case 'scheduled_search':
                    return this.artifactsCharacteristics('scheduled_search');
            default:
                throw new AlBadRequestError('The parameter \'entityType\' is not implemented yet', 'path', 'entityType');
        }
    }

    private async manageScheduledCharacteristics(): Promise<AlCardstackCharacteristics> {
        const characteristics: AlCardstackCharacteristics = {
            entity: {
                domain: '',
                property: '',
                caption: 'Create a Schedule',
                captionPlural: '',
                description: 'Lists your scheduled reports, searches and their notifications.',
                values: [],
                multiSelect: true,
                metadata: {
                    addButton: true,
                    calendar: false,
                },
            },
            groupableBy: [
                'notificationType',
            ],
            sortableBy: ['caption'], // TODO add"classification", "detectionSource"
            filterableBy: ['notificationType', 'accounts', 'users', 'integrations'],// TODO add classification, detectionSource
            searchableBy: ['caption', 'subtitle', 'searchables'],
            definitions: {},
            greedyConsumer: false,
            filterValueLimit: 15,
            filterValueIncrement: 15,
            hideEmptyFilterValues :false,
            localPagination: true,
            remoteSearch:false,
        };

        characteristics.definitions = await this.prepareManageScheduledFiltersDefinitions(this.accountId);


        return characteristics;

    }


    private async manageAlertCharacteristics(): Promise<AlCardstackCharacteristics> {
        const characteristics: AlCardstackCharacteristics = {
            entity: {
                domain: '',
                property: '',
                caption: 'Create a Notification',
                captionPlural: '',
                description: 'Your notifications for health exposures, incidents, and correlation observations that ' +
                'alert you based on your selected criteria in near real time.',
                values: [],
                multiSelect: true,
                metadata: {
                    addButton: true,
                    calendar: false,
                },
            },
            groupableBy: [
                'notificationType',
            ],
            sortableBy: [
                'caption',
                'createdTime',
                'modifiedTime',
            ],
            filterableBy: ['notificationType', 'accounts', 'users', 'integrations', 'threatLevel', 'escalated', 'deployments'],// TODO add classification, detectionSource
            searchableBy: ['caption', 'threatLevel', 'searchables'],
            definitions: {},
            greedyConsumer: false,
            filterValueLimit: 15,
            filterValueIncrement: 15,
            hideEmptyFilterValues :false,
            localPagination: true,
            remoteSearch:false,
        };

        characteristics.definitions = await this.prepareManageAlertsFiltersDefinitions(this.accountId);


        return characteristics;

    }

    private async incidentAlertCharacteristics(): Promise<AlCardstackCharacteristics> {
        const characteristics: AlCardstackCharacteristics = {
            entity: {
                domain: '',
                property: '',
                caption: 'Create an Alert',
                captionPlural: 'Create an Alert',
                values: [],
                multiSelect: true,
                metadata: {
                    calendar: false,
                    addButton: true,
                },
            },
            groupableBy: [],
            sortableBy: ['caption'], // TODO add"classification", "detectionSource"
            filterableBy: ['accounts', 'users', 'integrations', 'threatLevel'],// TODO add classification, detectionSource
            searchableBy: ['caption', 'threatLevel', 'searchables'],
            definitions: {},
            greedyConsumer: false,
            filterValueLimit: 15,
            filterValueIncrement: 15,
            hideEmptyFilterValues :false,
            localPagination: true,
            remoteSearch:false,
        };

        characteristics.definitions = await this.prepareIncidentsFiltersDefinitions(this.accountId);

        return characteristics;
    }

    private async scheduledReportCharacteristics(): Promise<AlCardstackCharacteristics> {
        const characteristics: AlCardstackCharacteristics = {
            entity: {
                domain: '',
                property: '',
                caption: 'Scheduled Reports',
                captionPlural: 'Scheduled Reports',
                values: [],
                multiSelect: true,
                metadata: {
                    calendar: false,
                    addButton: false,
                },
            },
            groupableBy: [],
            sortableBy: [],
            filterableBy: ['accounts', 'users', 'integrations', 'workbookSubMenu', 'workbookId', 'viewId', 'cadenceName'],
            searchableBy: ['caption', 'viewName', 'subtitle', 'searchables'],
            definitions: {},
            greedyConsumer: false,
            filterValueLimit: 15,
            filterValueIncrement: 15,
            hideEmptyFilterValues :false,
            localPagination: true,
            remoteSearch:false,
        };

        characteristics.definitions = await this.prepareScheduleFiltersDefinitions(this.accountId);

        return characteristics;
    }

    private async artifactsCharacteristics(type:string = 'artifacts'): Promise<AlCardstackCharacteristics> {
        let entity:string = type === 'artifacts' ? 'reports' : 'scheduled searches';
        const characteristics: AlCardstackCharacteristics = {
            entity: {
                domain: '',
                property: '',
                caption: 'Downloads',
                captionPlural: 'Downloads',
                description: `View and download ${entity} generated by a schedule that you set.`,
                values: [],
                multiSelect: true,
                metadata: {},
            },
            groupableBy: [],
            sortableBy: ['scheduledTime'],
            filterableBy: ['display','scheduleName'],
            searchableBy: [],
            definitions: {},
            greedyConsumer: false,
            filterValueLimit: 15,
            filterValueIncrement: 15,
            hideEmptyFilterValues :false,
            localPagination: false,
            remoteSearch:true,
        };

        characteristics.definitions = await this.prepareArtifactsFiltersDefinitions(this.accountId, type);

        return characteristics;
    }


    /**
     * process aims, iris and herald to make the filter definition with values for incidents
     */
    private prepareManageAlertsFiltersDefinitions = async (accountId: string) => {

        const filtersMetadata: {[propertyId: string]: AlCardstackPropertyDescriptor} = {
            accounts: CharacteristicsUtility.getAccountsDefinition(),
            users: CharacteristicsUtility.getUsersDefinition(),
            integrations: CharacteristicsUtility.getIntegrationsDefinition(),
            notificationType: CharacteristicsUtility.getNotificationType(),
            threatLevel: CharacteristicsUtility.getThreatLevelDefinition(),
            caption: CharacteristicsUtility.getCaptionDefinition(),
            searchables: CharacteristicsUtility.getSearchableDefinition(),
            createdTime: CharacteristicsUtility.getCreatedTimeDefinition(),
            modifiedTime: CharacteristicsUtility.getModifiedTimeDefinition(),
            escalated: CharacteristicsUtility.getEscalatedDefinition(),
            deployments: CharacteristicsUtility.getDeploymentsDefinition()
        };

        const [
            managedAccounts,
            incidentsFilters,
            accountSelected,
            connections,
            deployments
        ] = await Promise.all([
            client(AIMS).getAccountsByRelationship( accountId, "managed", {active: true}),
            AlIrisClient.getIncidentFilterDictionary(),
            client(AIMS).getAccountDetails(accountId),
            AlConnectorsClient.getConnections(accountId),
            AlDeploymentsClient.listDeployments(accountId)
        ]);

        filtersMetadata.accounts.values = CharacteristicsUtility.processWithIdAndName(
            managedAccounts.concat([accountSelected]),
            filtersMetadata.accounts.property);
        filtersMetadata.threatLevel.values = this.mapFieldToValueDesc(
            'threatLevels',
            incidentsFilters,
            filtersMetadata.threatLevel.property);
        filtersMetadata.escalated.values = CharacteristicsUtility.getEscalatedValues(filtersMetadata.escalated.property);
        filtersMetadata.deployments.values = CharacteristicsUtility.processWithIdAndName(deployments, filtersMetadata.deployments.property);
        filtersMetadata.integrations.values = CharacteristicsUtility.processWithIdAndName(connections, filtersMetadata.integrations.property);

        const list: AlGenericAlertDefinition[] = await ListHandler.handle(accountId, 'manage_alerts');
        // TODO: refactor and centralize this
        filtersMetadata.notificationType.values = CharacteristicsUtility.processWithIdAndName(
            list
                .filter(l => 'notificationType' in l.properties)
                .map((l) => (l.properties.notificationType))
                .filter((x, i, a) => a.indexOf(x) === i) // uniques
                .map(l => {
                    let name = l as string;
                    if (name.endsWith('/alerts')) {
                        name = name.replace('/alerts', '');
                        name = name.charAt(0).toUpperCase() + name.slice(1);
                    } else if (name.endsWith('/notification')) {
                        name = name.replace('/notification', '');
                        name = name.charAt(0).toUpperCase() + name.slice(1);
                    }

                    return ({ name, id: l });
                }),
            filtersMetadata.notificationType.property
        );

        return filtersMetadata;
    }


    private prepareManageScheduledFiltersDefinitions = async (accountId: string) => {

        const filtersMetadata: {[propertyId: string]: AlCardstackPropertyDescriptor} = {
            accounts: CharacteristicsUtility.getAccountsDefinition(),
            users: CharacteristicsUtility.getUsersDefinition(),
            integrations: CharacteristicsUtility.getIntegrationsDefinition(),
            notificationType: CharacteristicsUtility.getNotificationType(),
            caption: CharacteristicsUtility.getCaptionDefinition(),
            cadenceName: CharacteristicsUtility.getScheduleCadenceDefinition(),
            searchables: CharacteristicsUtility.getSearchableDefinition(),
        };

        const [
            managedAccounts,
            accountSelected,
            connections
        ] = await Promise.all([
            client(AIMS).getAccountsByRelationship( accountId, "managed", {active: true}),
            client(AIMS).getAccountDetails(accountId),
            AlConnectorsClient.getConnections(accountId)
        ]);

        filtersMetadata.accounts.values = CharacteristicsUtility.processWithIdAndName(
            managedAccounts.concat([accountSelected]),
            filtersMetadata.accounts.property);

        filtersMetadata.integrations.values = CharacteristicsUtility.processWithIdAndName(connections, filtersMetadata.integrations.property);

        const list: AlGenericAlertDefinition[] = await ListHandler.handle(accountId, 'manage_scheduled');
        // notification_type
        filtersMetadata.notificationType.values = CharacteristicsUtility.processWithIdAndName(
            list
                .filter(l => 'notificationType' in l.properties)
                .map((l) => l.properties.notificationType as string)
                .filter((x, i, a) => a.indexOf(x) === i) // uniques
                .map(l => {
                    let name = l;

                    if (name.startsWith('tableau')) {
                        // tableau/notifications
                        name = 'Scheduled Reports';
                    } else if (name.startsWith('search')){
                        // search/notifications
                        name = 'Scheduled Searches';
                    }

                    return ({ name, id: l });
                }),
            filtersMetadata.notificationType.property);
        await this.prepareTacomaFilters(accountId, filtersMetadata);
        filtersMetadata.cadenceName.values = CharacteristicsUtility.getScheduleCadenceValues(filtersMetadata.cadenceName.property);
        return filtersMetadata;
    }



    /**
     * process aims, iris and herald to make the filter definition with values for incidents
     */
    private prepareIncidentsFiltersDefinitions = async (accountId: string) => {

        const filtersMetadata: {[propertyId: string]: AlCardstackPropertyDescriptor} = {
            accounts: CharacteristicsUtility.getAccountsDefinition(),
            users: CharacteristicsUtility.getUsersDefinition(),
            integrations: CharacteristicsUtility.getIntegrationsDefinition(),
            threatLevel: CharacteristicsUtility.getThreatLevelDefinition(),
            // It is commented because it goes in part II
            // classification: {
            //     domain: '',
            //     metadata: {},
            //     property: 'classification',
            //     caption: 'Classification',
            //     captionPlural: 'Classifications',
            //     values: [],
            // },
            // detectionSource: {
            //     domain: '',
            //     metadata: {},
            //     property: 'detectionSource',
            //     caption: 'Detection Source',
            //     captionPlural: 'Detection Source',
            //     values: [],
            // },
            // users: {
            //     domain: '',
            //     metadata: {},
            //     property: 'users',
            //     caption: 'User',
            //     captionPlural: 'Users',
            //     values: [],
            // },
            // webhooks: {
            //     domain: '',
            //     metadata: {},
            //     property: 'webhooks',
            //     caption: 'Webhooks',
            //     captionPlural: 'Webhooks',
            //     values: [],
            // },
            caption: CharacteristicsUtility.getCaptionDefinition(),
            searchables: CharacteristicsUtility.getSearchableDefinition(),
        };

        const [
            webhooks,
            managedAccounts,
            incidentsFilters,
            accountSelected
        ] = await Promise.all([
            AlHeraldClient.getIntegrationsByAccount(accountId),
            client(AIMS).getAccountsByRelationship( accountId, "managed", {active: true}),
            AlIrisClient.getIncidentFilterDictionary(),
            client(AIMS).getAccountDetails(accountId)
        ]);

        // It is commented because it goes in part II
        // filtersMetadata.classification.values = this.mapFieldToValueDesc(
        //     'classifications',
        //     incidentsFilters,
        //     filtersMetadata.classification);
        // filtersMetadata.detectionSource.values = this.mapFieldToValueDesc(
        //     'detectionSources',
        //     incidentsFilters,
        //     filtersMetadata.detectionSource);
        // filtersMetadata.users.values = this.processWithIdAndName(users, filtersMetadata.users);
        // filtersMetadata.webhooks.values = this.processWithIdAndName(webhooks, filtersMetadata.webhooks);

        filtersMetadata.accounts.values = CharacteristicsUtility.processWithIdAndName(
            managedAccounts.concat([accountSelected]),
            filtersMetadata.accounts.property);
        filtersMetadata.threatLevel.values = this.mapFieldToValueDesc(
            'threatLevels',
            incidentsFilters,
            filtersMetadata.threatLevel.property);

        filtersMetadata.integrations.values = CharacteristicsUtility.processWithIdAndName(webhooks, filtersMetadata.integrations.property);

        return filtersMetadata;
    }

    /**
     * process aims, cargo to make the filter definition with values for incidents
     */
    private prepareScheduleFiltersDefinitions = async (accountId: string) => {

        let filtersMetadata: {[propertyId: string]: AlCardstackPropertyDescriptor} = {
            accounts: CharacteristicsUtility.getAccountsDefinition(),
            users: CharacteristicsUtility.getUsersDefinition(),
            integrations: CharacteristicsUtility.getIntegrationsDefinition(),
            cadenceName: CharacteristicsUtility.getScheduleCadenceDefinition(),
            searchables: CharacteristicsUtility.getSearchableDefinition(),
            caption: CharacteristicsUtility.getCaptionDefinition(),
        };

        const [
            webhooks,
            managedAccounts,
            accountSelected
        ] = await Promise.all([
            AlHeraldClient.getIntegrationsByAccount(accountId),
            client(AIMS).getAccountsByRelationship( accountId, "managed", {active: true}),
            client(AIMS).getAccountDetails(accountId)
        ]);

        filtersMetadata.accounts.values = CharacteristicsUtility.processWithIdAndName(
            managedAccounts.concat([accountSelected]),
            filtersMetadata.accounts.property);
        filtersMetadata.integrations.values = CharacteristicsUtility.processWithIdAndName(webhooks, filtersMetadata.integrations.property);

        filtersMetadata = await this.prepareTacomaFilters(accountId, filtersMetadata);

        filtersMetadata.cadenceName.values = CharacteristicsUtility.getScheduleCadenceValues(filtersMetadata.cadenceName.property);

        return filtersMetadata;
    }

    /**
     * process cargo and tacoma to make the filter definition with values for artifacts
     */
    private prepareArtifactsFiltersDefinitions = async (accountId: string, type:string) => {
        let filtersMetadata: {[propertyId: string]: AlCardstackPropertyDescriptor} = {};
        if(type === 'artifacts'){
            filtersMetadata = {
                scheduleName: CharacteristicsUtility.getScheduleNameDefinition(),
                display:  CharacteristicsUtility.getDisplayDefinition(),
                viewId: CharacteristicsUtility.getViewIdDefinition(),// Subcategory 2,
                scheduledTime: CharacteristicsUtility.getScheduledTimeDefinition()
            };

            const [
                workbooks,
                schedulesList
            ] = await Promise.all([
                ALTacoma.listWorkbooks(accountId),
                ALCargoV2.getAllSchedules(accountId, 'tableau')
            ]);

            filtersMetadata.scheduleName.values = [
                ...CharacteristicsUtility.processWithIdAndName(schedulesList.schedules, filtersMetadata.scheduleName.property),
            ];

            const tacomaProceced = this.buildCategoryDictionaries(
                workbooks,
                '',
                '',
                filtersMetadata.viewId.property,
                '');
            filtersMetadata.viewId.values = tacomaProceced.views;

            filtersMetadata.display.values = CharacteristicsUtility.getDisplayValues(filtersMetadata.display.property);
        }else if(type === 'scheduled_search'){
            filtersMetadata = {
                scheduleName: CharacteristicsUtility.getScheduleNameDefinition(),
                display:  CharacteristicsUtility.getDisplayDefinition(),
                scheduledTime: CharacteristicsUtility.getScheduledTimeDefinition()
            };

            const [
                schedulesList
            ] = await Promise.all([
                ALCargoV2.getAllSchedules(accountId, 'search_v2')
            ]);

            filtersMetadata.scheduleName.values = [
                ...CharacteristicsUtility.processWithIdAndName(schedulesList.schedules, filtersMetadata.scheduleName.property),
            ];

            filtersMetadata.display.values = CharacteristicsUtility.getDisplayValues(filtersMetadata.display.property);
        }

        return filtersMetadata;
    }

    private buildCategoryDictionaries(sites: AlTacomaSite[],
                                      workbookSubMenuProperty: string,
                                      workbookIdProperty: string,
                                      viewIdProperty: string,
                                      workbookBySubmenuProperty: string,
    ) {

        let categorySummaryValues = [];
        let categoryByWorkbookValues = [];
        let workbookSummaryValues = [];
        let viewSummaryValues = [];

        let tempCategorySummary = {};
        let tempCategoryByWorkbookSummary = {};
        let tempWorkbookSummary = {};
        let tempViewSumary = {};

        sites.forEach(site => {
            site.workbooks.forEach((workbook) => {
                CharacteristicsUtility.createPropertyDictionary(
                    tempCategorySummary,
                    workbook.sub_menu,
                    workbook.sub_menu);
                // TODO: delete tempCategoryByWorkbookSummary that information will be send in workbook metadata
                CharacteristicsUtility.createPropertyDictionary(tempCategoryByWorkbookSummary, workbook.id, workbook.sub_menu);

                CharacteristicsUtility.createPropertyDictionary(tempWorkbookSummary, workbook.id, workbook.name, { content_url: workbook.content_url, sub_menu: workbook.sub_menu });

                workbook.views.forEach(view => {
                    const metadata = {
                        embed_url: view.embed_url ,
                        scheduled_report: view.schedule_frequency,
                        filter_names: view.filter_names,
                        parent_account_only: view.parent_account_only
                    };
                    CharacteristicsUtility.createPropertyDictionary(tempViewSumary, view.id, view.name, metadata);
                });
            });
        });

        categorySummaryValues = CharacteristicsUtility.fromDictionaryToAlCardstackValueDescriptor(
            tempCategorySummary,
            workbookSubMenuProperty);
        categoryByWorkbookValues = CharacteristicsUtility.fromDictionaryToAlCardstackValueDescriptor(
            tempCategoryByWorkbookSummary,
            workbookBySubmenuProperty);
        workbookSummaryValues = CharacteristicsUtility.fromDictionaryToAlCardstackValueDescriptor(
            tempWorkbookSummary,
            workbookIdProperty);
        viewSummaryValues = CharacteristicsUtility.fromDictionaryToAlCardstackValueDescriptor(
            tempViewSumary,
            viewIdProperty);

        return {
            categories: categorySummaryValues,
            categoryWoorkbook: categoryByWorkbookValues,
            workbooks: workbookSummaryValues,
            views: viewSummaryValues,
        };
    }

    private mapFieldToValueDesc<K extends keyof AlIncidentFilterDictionary>(
        field: K,
        incidentsFilters: AlIncidentFilterDictionary,
        property: string): AlCardstackValueDescriptor[] {

        if (!incidentsFilters.hasOwnProperty(field)) {
            return [];
        }

        const values = Object.values(incidentsFilters[field])
                     .map((item) => CharacteristicsUtility.createAlCardstackValueDescriptor(item, property));
        return values;
    }

    private async prepareTacomaFilters(accountId: string, filtersMetadata: {[propertyId: string]: AlCardstackPropertyDescriptor}): Promise<{[propertyId: string]: AlCardstackPropertyDescriptor}> {
        filtersMetadata.workbookSubMenu = CharacteristicsUtility.getWorkbookSubMenuDefinition();// Category
        filtersMetadata.workbookId = CharacteristicsUtility.getWorkbookIdDefinition();// Subcategory
        filtersMetadata.viewId = CharacteristicsUtility.getViewIdDefinition();// Subcategory 2,
        filtersMetadata.workbookBySubmenu = CharacteristicsUtility.getWorkbookBySubMenuDefinition();

        const workbooks = await ALTacoma.listWorkbooks(accountId);

        const tacomaProceced = this.buildCategoryDictionaries(
            workbooks,
            filtersMetadata.workbookSubMenu.property,
            filtersMetadata.workbookId.property,
            filtersMetadata.viewId.property,
            filtersMetadata.workbookBySubmenu.property);
        filtersMetadata.workbookSubMenu.values = tacomaProceced.categories;
        filtersMetadata.viewId.values = tacomaProceced.views;
        filtersMetadata.workbookId.values = tacomaProceced.workbooks;
        filtersMetadata.workbookBySubmenu.values = tacomaProceced.categoryWoorkbook;

        return filtersMetadata;
    }
}
