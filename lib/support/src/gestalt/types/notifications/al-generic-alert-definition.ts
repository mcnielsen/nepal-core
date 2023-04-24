import { ScheduledReportV2 } from "@al/core/reporting";
import { AlChangeStamp } from '@al/core';
import { AlMergeHelper } from './al-merge-helper';
import { AlHeraldAccountSubscriptionV2 } from "@al/core/reporting";
import { AlAlertDefinition } from './al-alert-definition';
import {
    AlHealthAlertProperties,
    AlIncidentAlertProperties,
    AlNotificationTypeDescriptor,
    alNotificationTypeDictionary,
    AlScheduledReportProperties,
    alUnknownNotificationType,
} from './notification.types';

export class AlGenericAlertDefinition implements AlAlertDefinition {
    public id: string = '';
    public caption: string = '';
    public type:AlNotificationTypeDescriptor = alUnknownNotificationType;
    public properties: AlIncidentAlertProperties & AlScheduledReportProperties & AlHealthAlertProperties;


    constructor( origin?:AlAlertDefinition ) {
        this.properties = {
            id: this.id || '',
            caption: this.caption || this.id || ''
        };
        if ( origin ) {
            Object.assign( this, origin );      //  copy properties into self.  Thanks, origin!
            if ( origin.hasOwnProperty("properties" ) ) {
                Object.assign( this.properties, origin.properties );
            }
        }
    }

    public static fromSubscription( subscription:AlHeraldAccountSubscriptionV2,
                                    inheritFrom?:AlAlertDefinition ):AlGenericAlertDefinition {
        let definition = new AlGenericAlertDefinition( inheritFrom );
        definition.mergeSubscription( subscription );
        return definition;
    }

    public static fromSchedule( schedule:ScheduledReportV2,
                                inheritFrom?:AlAlertDefinition ):AlGenericAlertDefinition {
        let definition = new AlGenericAlertDefinition( inheritFrom );
        definition.mergeSchedule( schedule );
        return definition;
    }

    public mergeSubscription( subscription:AlHeraldAccountSubscriptionV2 ) {
        const merger = new AlMergeHelper( subscription, this.properties );
        merger.copy( 'id' );
        merger.rename( 'name', 'caption' );
        merger.rename( 'account_id', 'accountId' );
        merger.copy( 'active', 'filters', 'subscribers' );
        merger.rename( 'last_notification', 'lastMessageSent' );
        merger.rename( 'notification_type', 'notificationType' );
        merger.rename( 'external_id', 'externalId' );
        merger.rename( 'suppression_interval', 'suppressionInterval' );
        merger.with( 'created', ( changeStamp:AlChangeStamp ) => {
            this.properties.createdBy = changeStamp.by;
            this.properties.createdTime = changeStamp.at;
        } );
        merger.with( 'modified', ( changeStamp:AlChangeStamp ) => {
            this.properties.modifiedBy = changeStamp.by;
            this.properties.modifiedTime = changeStamp.at;
        } );
        merger.descend( 'options', null, optionMerger => {
            optionMerger.rename( "email_subject", "emailSubject" );
            optionMerger.rename( "webhook_payload", "webhookPayload" );
            optionMerger.rename( "include_attachments", "includeAttachments" );
        } );
        this.id = this.properties.id || this.id || "";
        this.caption = this.properties.caption || this.caption || "";
        if ( this.properties.notificationType ) {
            this.type = Object.values( alNotificationTypeDictionary ).find( t => t.notificationType === this.properties.notificationType ) || alUnknownNotificationType;
        }
        if ( ! this.type ) {
            this.type = alUnknownNotificationType;
        }
    }

    public mergeSchedule( schedule:ScheduledReportV2 ) {
        const merger = new AlMergeHelper( schedule, this.properties );
        merger.copy("id");
        merger.copy( 'schedule' );
        merger.rename("name", "caption" );
        merger.rename('is_active', 'active' );
        merger.descend( 'definition', null, definition => {
            definition.renameAll( [ "workbook_id", "workbookId" ],
                                  [ "view_id", "viewId" ],
                                  [ "site_id", "siteId" ],
                                  [ "filter_values", "reportFilters" ] );
            definition.copy( "format" );
        } );
        merger.with( 'created', ( changeStamp:AlChangeStamp ) => {
            this.properties.createdBy = changeStamp.by;
            this.properties.createdTime = changeStamp.at;
        } );
        merger.with( 'modified', ( changeStamp:AlChangeStamp ) => {
            this.properties.modifiedBy = changeStamp.by;
            this.properties.modifiedTime = changeStamp.at;
        } );
        this.id = this.properties.id || this.id || "";
        this.caption = this.properties.caption || this.caption || "";
    }
}
