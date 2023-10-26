/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
/* eslint-disable consistent-return */

'use strict';

const Homey = require('homey');
const axios = require('axios');
const https = require('https');
const moment = require('moment');
const momenttz = require('moment-timezone');

axios.defaults.timeout = 30000;
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true });

class BrandweerRooster extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    // this.url = 'www.brandweerrooster.nl';
    this.url = 'www.fireservicerota.co.uk';

    // register Flow listeners.
    // condition-prio
    const conditionIncidentPrio = this.homey.flow.getConditionCard('prio-is');
    conditionIncidentPrio.registerRunListener(async (args) => {
      const currentIncidentPrio = await args.device.getCapabilityValue('incident_prio');
      this.log(`FLOW-CONDITION -- Prio is current:          ${currentIncidentPrio}`);
      this.log(`FLOW-CONDITION -- Flowcard PRIO  is set to: ${args.prio}`);
      return currentIncidentPrio === args.prio;
    });

    // condition-onDuty
    const conditionOnduty = this.homey.flow.getConditionCard('onduty-offduty');
    conditionOnduty.registerRunListener(async (args) => {
      const currentOnduty = await args.device.onduty();
      this.log(`FLOW-CONDITION -- Person is current : ${currentOnduty}`);
      this.log(`FLOW-CONDITION -- Flowcard is set to: ${args.onDuty}`);
      return currentOnduty === args.onDuty;
    });

    // action incident-response
    const actionIncidentResponse = this.homey.flow.getActionCard('send-incident-response');
    actionIncidentResponse.registerRunListener(async (args) => {
      const incidentId = this.homey.settings.get('incident_id');
      const response = await this.incidentResponse(args.response, incidentId);
      if (response) {
        this.log(`FLOW-ACTION -- Succesfully sent IncidentResponse for incidentID: ${incidentId} with response: ${args.response}`);
      }
    });

    // action schedule-exception
    const scheduleException = this.homey.flow.getActionCard('send-schedule-exception');
    scheduleException.registerRunListener(async (args) => {
      const startDate = args.start_date.split('-');
      const endDate = args.end_date.split('-');

      const start_time = moment.tz(`${startDate[2]}-${startDate[1]}-${startDate[0]} ${args.start_time}`, this.homey.clock.getTimezone());
      const end_time = moment.tz(`${endDate[2]}-${endDate[1]}-${endDate[0]} ${args.end_time}`, 'Europe/Amsterdam');

      const response = await this.scheduleException(args.device.getData().id, start_time.format(), end_time.format(), args.available);
      if (response) {
        this.log(`FLOW-ACTION -- Succesfully sent scheduleException for user: ${args.device.getData().id}`);
      }
    });

    // action schedule-exception custom
    const scheduleExceptionCustom = this.homey.flow.getActionCard('send-schedule-exception_custom');
    scheduleExceptionCustom.registerRunListener(async (args) => {
      const startDate = args.start_date.split('-');
      const endDate = args.end_date.split('-');

      const start_time = moment.tz(`${startDate[2]}-${startDate[1]}-${startDate[0]} ${args.start_time}`, this.homey.clock.getTimezone());
      const end_time = moment.tz(`${endDate[2]}-${endDate[1]}-${endDate[0]} ${args.end_time}`, 'Europe/Amsterdam');

      const response = await this.scheduleException(args.device.getData().id, start_time.format(), end_time.format(), args.available);
      if (response) {
        this.log(`FLOW-ACTION -- Succesfully sent scheduleException(custom) for user: ${args.device.getData().id}`);
      }
    });
  }

  // loginServices with username and password, succesful login generate the access_token and refresh_token
  async loginServices(username, password) {
    try {
      const { data, status } = await axios({
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://${this.url}/oauth/token`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Pragma: 'no-cache',
        },
        data: {
          grant_type: 'password',
          username,
          password,
        },
      });
      if (typeof status !== 'undefined') {
        if (status === 200) {
          this.homey.settings.set('username', username);
          this.homey.settings.set('password', password);
          this.access_token = data.access_token;
          this.refresh_token = data.refresh_token;
          this.expired_token_time = data.expires_in;
          this.log('---------------------------------------');
          this.log(`Succesful login for user: ${username}`);
          this.log(`AccesToken  : ${this.access_token}`);
          this.log(`Expires_in  : ${this.expired_token_time}`);
          this.log(`RefreshToken: ${this.refresh_token}`);
          this.log('---------------------------------------');
          this.loginOk = true;
          return true;
        }
      }
    } catch (err) {
      if (err.response.status === 401) {
        this.url = 'www.brandweerrooster.nl'; // change the URL if login fails with 401 error
        return false;
      }
      if (err.response.status !== 200) {
        this.log(`loginServices Resource could not be found: ${err.response.status}`);
        this.error(err);
      }
      this.loginOk = false;
      return false;
    }
  }

  async getUrl() {
    return this.url;
  }

  async getAccessToken() {
    return this.access_token;
  }

  // refreshTokenServices generates a new access_token and refresh_token
  async refreshTokenServices() {
    if (this.loginOk) {
      try {
        const { data, status } = await axios({
          method: 'post',
          maxBodyLength: Infinity,
          url: `https://${this.url}/oauth/token`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Pragma: 'no-cache',
          },
          data: {
            grant_type: 'refresh_token',
            refresh_token: this.refresh_token,
          },
        });

        if (typeof status !== 'undefined') {
          if (status === 200) {
            this.access_token = data.access_token;
            this.expired_token_time = data.expires_in;
            this.refresh_token = data.refresh_token;
            this.log('---------------------------------------');
            this.log(`AccesToken  : ${this.access_token}`);
            this.log(`Expires_in  : ${this.expired_token_time}`);
            this.log(`Refreshtoken: ${this.refresh_token}`);
            this.log('---------------------------------------');
            return true;
          }
        }
      } catch (err) {
        if (err.response.status !== 200) {
          this.log(`refreshTokenServices Resource could not be found: ${err.response.status}`);
          this.error(err);
          return false;
        }
      }
    }
  }

  // Pairing (user)data for in device array
  async getUserAccountInfo() {
    try {
      const { data, status } = await axios({
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://${this.url}/api/v2/users/current`,
        headers: {
          Authorization: `Bearer ${this.access_token}`,
          'Content-type': 'application/json',
        },
      });
      if (typeof status !== 'undefined') {
        if (status === 200) {
          return data;
        }
      }
    } catch (err) {
      if (err.response.status !== 200) {
        this.log(`getUserAccount Resource could not be found: ${err.response.status}`);
        this.error(err);
        return err.response.status;
      }
    }
  }

  // incident repsonse  where incidentStatus can be acknowlegde or rejected.
  async incidentResponse(incidentStatus, incidentID) {
    try {
      const { data, status } = await axios({
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://${this.url}/api/v2/incidents/${incidentID}/incident_responses`,
        headers: {
          Authorization: `Bearer ${this.access_token}`,
          'Content-type': 'application/json',
        },
        data: {
          status: incidentStatus,
          channel: 'home_automation',
          id: incidentID,
        },
      });
      if (typeof status !== 'undefined') {
        if (status === 201) {
          return true;
        }
      }
    } catch (err) {
      if (err.response.status !== 201) {
        this.log(`incidentResponse Resource could not be found: ${err.response.status}`);
        this.error(err);
        return false;
      }
    }
  }

  // scheduleException API-CALL
  async scheduleException(id, start_time, end_time, available) {
    try {
      const { data, status } = await axios({
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://${this.url}/api/v2/users/${id}/schedule_exceptions`,
        headers: {
          Authorization: `Bearer ${this.access_token}`,
          'Content-type': 'application/json',
        },
        data: {
          id,
          start_time,
          end_time,
          available,
          ignore_schedule_warnings: true,
          channel: 'app',
        },
      });
      if (typeof status !== 'undefined') {
        if (status === 201) {
          return true;
        }
      }
    } catch (err) {
      if (err.response.status !== 201) {
        this.log(`scheduleException Resource could not be found: ${err.response.status}`);
        this.error(err);
        return false;
      }
    }
  }

}

module.exports = BrandweerRooster;
