import * as fs from 'node:fs';
import * as path from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';


describe('data-dictionary generate NUTs', () => {
  let session: TestSession;

  before(async () => {
    // Create a TestSession - it automatically creates a project directory
    session = await TestSession.create({
      devhubAuthStrategy: 'AUTO',
    });

    // Manually create sfdx-project.json in the session's project directory
    const sfdxProjectJson = {
      packageDirectories: [{ path: 'force-app', default: true }],
      name: 'test-project',
      namespace: '',
      sfdcLoginUrl: 'https://login.salesforce.com',
      sourceApiVersion: '61.0',
    };

    fs.writeFileSync(path.join(session.dir, 'sfdx-project.json'), JSON.stringify(sfdxProjectJson, null, 2));

    // Create the force-app directory structure
    fs.mkdirSync(path.join(session.dir, 'force-app'), { recursive: true });
  });

  after(async () => {
    await session?.clean();
  });

  it('should generate data dictionary successfully', function () {
    // Test the command - it will use default org if available
    // Note: This test requires an authenticated Salesforce org
    const command = 'data-dictionary generate --api-version 61.0';

    try {
      // Execute command in the session's project directory
      const output = execCmd(command, {
        ensureExitCode: 0,
        cwd: session.dir, // Run in the temporary project directory
      }).shellOutput.stdout;

      // Verify the command outputs success message
      expect(output).to.include('Success: true');
      expect(output).to.include('Output folder:');
    } catch (error) {
      // Skip test if no org is available (common in local development without org)
      if (error instanceof Error && error.message.includes('NoUsernameFoundError')) {
        this.skip();
      } else {
        throw error;
      }
    }
  });
});
