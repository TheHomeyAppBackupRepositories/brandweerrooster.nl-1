'use strict';

const Homey = require('homey');

class Driver extends Homey.Driver {

  async onPair(session) {
    let username = '';
    let password = '';

    session.setHandler('login', async (data) => {
      username = data.username;
      password = data.password;

      const credentialsAreValid = await this.homey.app.loginServices(
        username, password,
      );

      if (!credentialsAreValid) {
        const credentialsAreValid = await this.homey.app.loginServices(
          username, password,
        );
        return credentialsAreValid;
      }

      // return true to continue adding the device if the login succeeded
      // return false to indicate to the user the login attempt failed
      // thrown errors will also be shown to the user
      return credentialsAreValid;
    });

    session.setHandler('list_devices', async () => {
      const userAccountInfo = await this.homey.app.getUserAccountInfo();
      const device = [{
        name: `BrandweerRooster - ${userAccountInfo.last_name}, ${userAccountInfo.first_name}`,
        data: {
          id: userAccountInfo.id,
        },
      }];

      return device;
    });
  }

  async onRepair(session) {
    let username = '';
    let password = '';

    session.setHandler('login', async (data) => {
      username = data.username;
      password = data.password;

      const credentialsAreValid = await this.homey.app.loginServices(
        username, password,
      );

      // return true to continue adding the device if the login succeeded
      // return false to indicate to the user the login attempt failed
      // thrown errors will also be shown to the user
      return credentialsAreValid;
    });

    session.setHandler('list_devices', async () => {
      const userAccountInfo = await this.homey.app.getUserAccountInfo();
      const device = [{
        name: `BrandweerRooster - ${userAccountInfo.last_name}, ${userAccountInfo.first_name}`,
        data: {
          id: userAccountInfo.id,
        },
      }];

      return device;
    });
  }

}

module.exports = Driver;
