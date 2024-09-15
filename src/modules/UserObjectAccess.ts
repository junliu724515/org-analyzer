import { Connection } from '@salesforce/core';
import { QueryResult } from '@jsforce/jsforce-node/lib/query.js';
import { Record } from '@jsforce/jsforce-node/lib/types/common.js';
import { getManagedObjects } from './helper.js';

export type UserObjectAccessOptions = {
  conn: Connection;
  username: string;
  includeManaged?: boolean;
  excludeManagedPrefixes?: string[];
};

export default class UserObjectAccess {
  private opts: UserObjectAccessOptions;
  private managedObjects: Set<string> = new Set<string>();

  public constructor(opts: UserObjectAccessOptions) {
    this.opts = opts;
  }

  public async getReadableObjects(): Promise<Set<string>> {
    const readableObjects = new Set<string>();
    this.managedObjects = await getManagedObjects(this.opts.conn);

    const userInfo = await this.opts.conn.query(`
      SELECT Id, ProfileId,
        (SELECT AssigneeId, PermissionSetId FROM PermissionSetAssignments)
      FROM User
      WHERE Username = '${this.opts.username}'
    `);

    if (userInfo.records.length === 0) {
      throw new Error('User not found');
    }

    const user = userInfo.records[0] as Record;
    const profileId = user.ProfileId as string;
    const permissionSets = user.PermissionSetAssignments as QueryResult<Record>;
    const permissionSetIds: string[] = [];
    for (const psa of permissionSets.records) {
      permissionSetIds.push(psa.PermissionSetId as string);
    }
    await this.addProfileObjectPermissions(readableObjects, profileId);
    await this.addPermissionSetObjectPermissions(readableObjects, permissionSetIds);

    if (this.opts.includeManaged) {
      return this.filterOutExcludedManagedPrefixes(readableObjects);
    }
    return this.filterManagedObjects(readableObjects);
  }

  private async addProfileObjectPermissions(readableObjects: Set<string>, profileId: string): Promise<void> {
    const profileObjectPermissions = await this.opts.conn.query(`
      SELECT SobjectType
      FROM ObjectPermissions
      WHERE ParentId = '${profileId}' AND PermissionsRead = true
    `);

    profileObjectPermissions.records.forEach((record) => {
      readableObjects.add(record.SobjectType as string);
    });
  }

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
      readableObjects.add(record.SobjectType as string);
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
