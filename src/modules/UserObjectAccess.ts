import { Connection, Messages } from '@salesforce/core';
import { QueryResult } from '@jsforce/jsforce-node/lib/query.js';
import { Record } from '@jsforce/jsforce-node/lib/types/common.js';
import { getManagedObjects, getStandardObjects } from './helper.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('org-analyzer', 'data-dictionary.generate');

/**
 * Options for accessing user objects.
 */
export type UserObjectAccessOptions = {
  conn: Connection;
  username: string;
  includeManaged?: boolean;
  excludeManagedPrefixes?: string[];
};

/**
 * Class representing user object access functionality.
 */
export default class UserObjectAccess {
  private readonly opts: UserObjectAccessOptions;
  private managedObjects: Set<string> = new Set<string>();
  private standardObjects: Set<string> = new Set<string>();

  /**
   * Constructor for the UserObjectAccess class.
   *
   * @param {UserObjectAccessOptions} opts - The options for accessing user objects.
   */
  public constructor(opts: UserObjectAccessOptions) {
    this.opts = opts;
  }

  /**
   * Retrieves the set of readable objects for the user.
   *
   * @returns {Promise<Set<string>>} - A promise that resolves to a set of readable object names.
   */
  public async getReadableObjects(): Promise<Set<string>> {
    // Initialize managed and standard objects
    await this.initializeObjects();
    // Retrieve user information
    const user = await this.getUserInfo();
    // Retrieve permission set IDs for the user
    const permissionSetIds = await this.getPermissionSetIds(user);
    // Retrieve readable objects based on permission sets
    const readableObjects = await this.getPermissionSetObjectPermissions(permissionSetIds);

    // Filter out managed objects if includeManaged is false, otherwise filter out excluded managed prefixes
    return this.opts.includeManaged
      ? this.filterOutExcludedManagedPrefixes(readableObjects)
      : this.filterManagedObjects(readableObjects);
  }

  /**
   * Initializes managed and standard objects.
   *
   * @returns {Promise<void>} - A promise that resolves when initialization is complete.
   */
  private async initializeObjects(): Promise<void> {
    // Retrieve managed and standard objects concurrently
    [this.managedObjects, this.standardObjects] = await Promise.all([
      getManagedObjects(this.opts.conn),
      getStandardObjects(this.opts.conn),
    ]);
  }

  /**
   * Retrieves user information based on the username.
   *
   * @returns {Promise<Record>} - A promise that resolves to the user record.
   * @throws {Error} - Throws an error if no user is found.
   */
  private async getUserInfo(): Promise<Record> {
    // Query user information including profile and permission set assignments
    const userInfo = await this.opts.conn.query<Record>(`
      SELECT Id, ProfileId, Profile.Name,
        (SELECT AssigneeId, PermissionSetId FROM PermissionSetAssignments)
      FROM User
      WHERE Username = '${this.opts.username}'
    `);

    // Throw an error if no user is found
    if (userInfo.records.length === 0) {
      throw new Error(messages.getMessage('error.noUserFound', [this.opts.username]));
    }

    // Return the user record
    return userInfo.records[0];
  }

  /**
   * Retrieves permission set IDs for the user.
   *
   * @param {Record} user - The user record.
   * @returns {Promise<string[]>} - A promise that resolves to an array of permission set IDs.
   */
  private async getPermissionSetIds(user: Record): Promise<string[]> {
    // Retrieve the profile ID from the user record
    const profileId = user.ProfileId as string;
    // Query the permission set ID associated with the profile
    const profilePermSetIdRecord = await this.opts.conn.query<{ Id: string }>(
      `SELECT Id FROM PermissionSet WHERE ProfileId = '${profileId}'`
    );
    const profilePermSetId = profilePermSetIdRecord.records[0].Id;

    // Retrieve permission set assignments for the user
    const permissionSets = user.PermissionSetAssignments as QueryResult<Record>;
    // Return an array of permission set IDs including the profile permission set ID
    return [profilePermSetId, ...permissionSets.records.map((psa) => psa.PermissionSetId as string)];
  }

  /**
   * Retrieves readable objects based on permission set IDs.
   *
   * @param {string[]} permissionSetIds - The array of permission set IDs.
   * @returns {Promise<Set<string>>} - A promise that resolves to a set of readable object names.
   */
  private async getPermissionSetObjectPermissions(permissionSetIds: string[]): Promise<Set<string>> {
    // Return an empty set if no permission set IDs are provided
    if (permissionSetIds.length === 0) return new Set<string>();

    // Query object permissions for the provided permission set IDs
    const permissionSetObjectPermissions = await this.opts.conn.query<{ SobjectType: string }>(`
      SELECT SobjectType
      FROM ObjectPermissions
      WHERE ParentId IN ('${permissionSetIds.join("','")}') AND PermissionsRead = true
    `);

    // Filter and return readable objects that are either custom or standard objects
    return new Set(
      permissionSetObjectPermissions.records
        .map((record) => record.SobjectType)
        .filter((recordType) => recordType.endsWith('__c') || this.standardObjects.has(recordType))
    );
  }

  /**
   * Filters out managed objects from the provided set of objects.
   *
   * @param {Set<string>} objects - The set of objects to filter.
   * @returns {Set<string>} - The filtered set of objects.
   */
  private filterManagedObjects(objects: Set<string>): Set<string> {
    // Return a new set excluding managed objects
    return new Set([...objects].filter((obj) => !this.managedObjects.has(obj)));
  }

  /**
   * Filters out objects with excluded managed prefixes from the provided set of objects.
   *
   * @param {Set<string>} objects - The set of objects to filter.
   * @returns {Set<string>} - The filtered set of objects.
   */
  private filterOutExcludedManagedPrefixes(objects: Set<string>): Set<string> {
    // Return the original set if no excluded managed prefixes are provided
    if (!this.opts.excludeManagedPrefixes) return objects;

    // Return a new set excluding objects with specified managed prefixes
    return new Set(
      [...objects].filter(
        (obj) =>
          !this.managedObjects.has(obj) || !this.opts.excludeManagedPrefixes?.some((prefix) => obj.startsWith(prefix))
      )
    );
  }
}
