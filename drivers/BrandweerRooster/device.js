'use strict';

const { Device } = require('homey');
const WebSocket = require('ws');

class MyDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.debug = false;
    this.setUnavailable();
    this.log(`BrandweerRooster-DEVICE INIT for user ${this.getName()} ---ID: ${this.getData().id}`);

    // Do first login in case of a restart of the app.
    const loginSucceful = await this.homey.app.loginServices(this.homey.settings.get('username'), this.homey.settings.get('password')).catch(this.error);

    if (loginSucceful) {
      await this.tokenRenewal(); // start token renewal
      await this.WebSocketConnection(); // start the websocket
    } else {
      await this.retryLogin(); // if login failed retry
    }

    if (!this.hasCapability('incident_task_ids')) {
      await this.addCapability('incident_task_ids');
    }
  }

  async onduty() { // returrn onduty/offduty for flowcondintion
    return this.Onduty;
  }

  // received incident thru websocket.
  async onUpdateEvent(msg) {
    if (msg.message.incident_responses.length > 0) {
      this.Onduty = 'offduty';
      const incidentIdUpdate = msg.message.id;
      const incidentIdCurrent = await this.homey.settings.get('incident_id');
      if (incidentIdUpdate !== incidentIdCurrent) {
        this.homey.settings.set('incident_id', msg.message.id); // store the incidentID
      }

      // match user_id to see of user is Onduty
      for (let i = 0; i < msg.message.incident_responses.length; i++) {
        if (this.getData().id === msg.message.incident_responses[i].user_id) {
          this.Onduty = 'onduty';
        }
      }

      if (incidentIdUpdate === incidentIdCurrent) {
        let incidentPrioUpdate = msg.message.prio;
        if (incidentPrioUpdate === '') {
          incidentPrioUpdate = 'noPrio';
        }

        const incidentPrioCurrent = await this.getCapabilityValue('incident_prio');
        if (incidentPrioUpdate !== incidentPrioCurrent && incidentPrioUpdate !== undefined) {
          await this.setCapabilityValue('incident_prio', incidentPrioUpdate).catch(this.error);
          this.log(`ID: ${msg.message.id} Update received for incident_prio - Value: ${incidentPrioUpdate}`);
        }

        const ds = new Date(msg.message.created_at);
        const date = ds.toString().substring(4, 11);
        const time = ds.toLocaleTimeString('nl-NL', { hour12: false, timeZone: this.homey.clock.getTimezone() }).substring(0, 5);
        const incidentCreatedUpdate = `${date} ${time}`;
        const incidentCreatedCurrent = await this.getCapabilityValue('incident_start_time');
        if (incidentCreatedUpdate !== incidentCreatedCurrent && incidentCreatedUpdate !== undefined) {
          await this.setCapabilityValue('incident_start_time', incidentCreatedUpdate).catch(this.error);
          this.log(`ID: ${msg.message.id} Update received for incident_start_time - Value: ${incidentCreatedUpdate}`);
        }

        const incidentLocationUpdate = msg.message.location;
        const incidentLocationCurrent = await this.getCapabilityValue('incident_location');
        if (incidentLocationUpdate !== incidentLocationCurrent && incidentLocationUpdate !== undefined) {
          await this.setCapabilityValue('incident_location', incidentLocationUpdate).catch(this.error);
          this.log(`ID: ${msg.message.id} Update received for incident_location - Value: ${incidentLocationUpdate}`);
        }

        const incidentBodyUpdate = msg.message.body;
        const incidentBodyCurrent = await this.getCapabilityValue('incident_body');
        if (incidentBodyUpdate !== incidentBodyCurrent && incidentBodyUpdate !== undefined) {
          await this.setCapabilityValue('incident_body', incidentBodyUpdate).catch(this.error);
          this.log(`ID: ${msg.message.id} Update received for incident_body - Value: ${incidentBodyUpdate}`);
        }

        let incidentTasksIDUpdate = JSON.stringify(msg.message.task_ids);
        incidentTasksIDUpdate = incidentTasksIDUpdate.replace(/[[\]']+/g, '');
        const incidentTasksIDCurrent = await this.getCapabilityValue('incident_task_ids');
        if (incidentTasksIDUpdate !== incidentTasksIDCurrent && incidentTasksIDUpdate !== undefined) {
          await this.setCapabilityValue('incident_task_ids', incidentTasksIDUpdate).catch(this.error);
          this.log(`ID: ${msg.message.id} Update received for incident_task_ids - Value: ${incidentTasksIDUpdate}`);
        }
      }
    }
  }

  // token renewal interval
  async tokenRenewal() {
    this.tokenRenwalInterval = this.homey.setInterval(async () => {
      try {
        const tokenrenewalSuccesful = this.homey.app.refreshTokenServices();
        if (tokenrenewalSuccesful) {
          this.log('Token expired ### refreshed ###');
        }
      } catch (error) {
        this.error(error);
      }
    }, 86400000); // 24H
  }

  // if login failed retry 10 times with a delay 15sec
  async retryLogin() {
    this.debouncer = 0;
    this.retryLoginInterval = this.homey.setInterval(async () => {
      try {
        if (this.debouncer < 10) {
          this.debouncer++;
          const loginSucceful = await this.homey.app.loginServices(this.homey.settings.get('username'), this.homey.settings.get('password')).catch(this.error);
          if (loginSucceful) {
            clearInterval(this.retryLoginInterval);
            this.setAvailable();
            await this.tokenRenewal(); // start token renewal
            await this.WebSocketConnection(); // start the websocket
          } else {
            this.setUnavailable('Login Failed try to repair');
            this.log('Login Failed try to repair');
          }
        }
      } catch (error) {
        this.error(error);
      }
    }, 5000); // 5sec
  }

  // WEBSOCKET FOR PROCESSING realtime incident
  async WebSocketConnection() {
    try {
      this.url = await this.homey.app.getUrl();
      this.access_token = await this.homey.app.getAccessToken();

      if (this.ws == null || this.ws.readyState === WebSocket.CLOSED) {
        this.debouncer++;

        const urlEndpoint = `wss://${this.url}/cable?access_token=${this.access_token}`;

        this.ws = new WebSocket(urlEndpoint, {
          origin: urlEndpoint,
        });

        this.ws.on('open', () => {
          this.log('Websocket opened');
          const msg = {
            command: 'subscribe',
            identifier: JSON.stringify({
              channel: 'IncidentNotificationsChannel',
            }),
          };
          this.ws.send(JSON.stringify(msg));
          this.wsConnected = true;
          this.debouncer = 0;
          this.setAvailable();
        });

        this.ws.on('message', async (response) => {
          try {
            const msg = JSON.parse(response);
            if (msg.type === 'ping') { // Ignores pings.
              return;
            }
            if (msg.type === 'welcome') { // print subcribe incidents
              this.log('Subscribed to IncidentNotificationsChannel on websocket');
            }
            if (msg?.message?.type === 'incident_alert') {
              await this.onUpdateEvent(msg);
              if (this.debug) {
                this.log(msg);
              }
            }
          } catch (error) {
            this.error(error);
          }
        });

        this.ws.on('error', (error) => {
          this.error('Websocket error:', error.message);
        });

        this.ws.on('close', (code, reason) => {
          this.error('Websocket closed due to reasoncode:', code);
          clearTimeout(this.wsReconnectTimeout);
          this.wsConnected = false;

          if (code !== 1006) {
            // retry connection after 30 seconds and if not retried 10 times already
            if (this.debouncer < 10) {
              this.wsReconnectTimeout = this.homey.setTimeout(async () => {
                await this.WebSocketConnection();
              }, 5000);// 5sec
            } else {
              this.wsReconnectTimeout = this.homey.setTimeout(async () => {
                await this.WebSocketConnection();
              }, 60000); // 1min
            }
          } else {
            this.wsReconnectTimeout = this.homey.setTimeout(async () => {
              await this.WebSocketConnection();
            }, 60000); // 1min
          }
        });
      }
    } catch (error) {
      this.error(error);
      clearTimeout(this.wsReconnectTimeout);
      if (this.debouncer < 10) {
        this.wsReconnectTimeout = this.homey.setTimeout(async () => {
          if (!this.wsConnected) {
            await this.WebSocketConnection();
          }
        }, 1000);// 1sec
      } else {
        this.wsReconnectTimeout = this.homey.setTimeout(async () => {
          if (!this.wsConnected) {
            await this.WebSocketConnection();
          }
        }, 60000); // 1min
      }
    }
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('BrandweerRooster-DEVICE has been deleted');
    clearInterval(this.tokenRenwalInterval);
    clearInterval(this.retryLoginInterval);
    this.ws.close();
  }

  async onUninit() {
    clearInterval(this.retryLoginInterval);
    clearInterval(this.tokenRenwalInterval);
    this.ws.close();
  }

}

module.exports = MyDevice;
