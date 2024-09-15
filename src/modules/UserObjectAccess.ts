import { Connection, Messages } from '@salesforce/core';
import { QueryResult } from '@jsforce/jsforce-node/lib/query.js';
import { Record } from '@jsforce/jsforce-node/lib/types/common.js';
import { getManagedObjects, getStandardObjects } from './helper.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('org-analyzer', 'data-dictionary.generate');

export type UserObjectAccessOptions = {
  conn: Connection;
  username: string;
  includeManaged?: boolean;
  excludeManagedPrefixes?: string[];
};

export default class UserObjectAccess {
  private opts: UserObjectAccessOptions;
  private managedObjects: Set<string> = new Set<string>();
  private standardObjects: Set<string> = new Set<string>();

  public constructor(opts: UserObjectAccessOptions) {
    this.opts = opts;
  }

  public async getReadableObjects(): Promise<Set<string>> {
    const readableObjects = new Set<string>();
    this.managedObjects = await getManagedObjects(this.opts.conn);
    this.standardObjects = await getStandardObjects(this.opts.conn);

    const userInfo = await this.opts.conn.query(`
      SELECT Id, ProfileId, Profile.Name,
        (SELECT AssigneeId, PermissionSetId FROM PermissionSetAssignments)
      FROM User
      WHERE Username = '${this.opts.username}'
    `);

    if (userInfo.records.length === 0) {
      throw new Error(messages.getMessage('error.noUserFound', [this.opts.username]));
    }

    const user = userInfo.records[0] as Record;
    const profileId = user.ProfileId as string;
    // const profile = user.Profile as Record;
    // const profileName = profile.Name as string;
    // if (profileName === 'System Administrator') {
    //    throw new Error(messages.getMessage('error.wrongProfile', [this.opts.username]));
    // }

    const profilePermSetIdRecord = await this.opts.conn.query(
      `SELECT Id FROM PermissionSet WHERE ProfileId = '${profileId}'`
    );
    const profilePermSetId = profilePermSetIdRecord.records[0].Id as string;

    const permissionSets = user.PermissionSetAssignments as QueryResult<Record>;
    const permissionSetIds: string[] = [profilePermSetId];
    for (const psa of permissionSets.records) {
      permissionSetIds.push(psa.PermissionSetId as string);
    }
    // await this.addProfileObjectPermissions(readableObjects, profileId);
    await this.addPermissionSetObjectPermissions(readableObjects, permissionSetIds);

    if (this.opts.includeManaged) {
      return this.filterOutExcludedManagedPrefixes(readableObjects);
    }
    return this.filterManagedObjects(readableObjects);
  }

  // private async addProfileObjectPermissions(readableObjects: Set<string>, profileId: string): Promise<void> {
  //   const profileObjectPermissions = await this.opts.conn.query(`
  //     SELECT SobjectType
  //     FROM ObjectPermissions
  //     WHERE ParentId = '${profileId}' AND PermissionsRead = true
  //   `);
  //
  //   profileObjectPermissions.records.forEach((record) => {
  //     const recordType = record.SobjectType as string;
  //     if (recordType.endsWith('__c')|| this.standardObjects.has(recordType)) {
  //     readableObjects.add(recordType);
  //     }
  //   });
  // }

  private async addPermissionSetObjectPermissions(
    readableObjects: Set<string>,
    permissionSetIds: string[]
  ): Promise<void> {
    if (permissionSetIds.length === 0) return;

    const permissionSetObjectPermissions = await this.opts.conn.query(`
      SELECT SobjectType
      FROM ObjectPermissions
      WHERE ParentId IN ('${permissionSetIds.join("','")}') AND PermissionsRead = true
    `);
    permissionSetObjectPermissions.records.forEach((record) => {
      const recordType = record.SobjectType as string;
      if (recordType.endsWith('__c') || this.standardObjects.has(recordType)) {
        readableObjects.add(recordType);
      }
    });
  }

  private filterManagedObjects(objects: Set<string>): Set<string> {
    return new Set([...objects].filter((obj) => !this.managedObjects.has(obj)));
  }

  private filterOutExcludedManagedPrefixes(objects: Set<string>): Set<string> {
    if (!this.opts.excludeManagedPrefixes) {
      return objects;
    }
    return new Set(
      [...objects].filter(
        (obj) =>
          !this.managedObjects.has(obj) || !this.opts.excludeManagedPrefixes?.some((prefix) => obj.startsWith(prefix))
      )
    );
  }
}
