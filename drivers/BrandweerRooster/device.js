'use strict';

const { Device } = require('homey');
const eventBus = require('@tuxjs/eventbus');

class MyDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`BrandweerRooster-DEVICE INIT for user ${this.getName()} ---ID: ${this.getData().id}`);

    // Do first login in case of a restart of the app.
    const loginSucceful = await this.homey.app.loginServices(this.homey.settings.get('username'), this.homey.settings.get('password')).catch(this.error);

    if (loginSucceful) {
      await this.tokenRenewal(); // start token renewal
      await this.homey.app.WebSocketConnection(); // start the websocket
      this.setAvailable();
    } else {
      await this.retryLogin(); // if login failed retry
    }

    eventBus.subcribe('update', async (msg) => { // eventbus for incoming updateevents from websocket
      await this.onUpdateEvent(msg);
    });
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
            await this.homey.app.WebSocketConnection(); // start the websocket
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

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('BrandweerRooster-DEVICE has been deleted');
    clearInterval(this.tokenRenwalInterval);
    clearInterval(this.retryLoginInterval);
    await this.homey.app.websocketDiscconect(true);
  }

  async onUninit() {
    clearInterval(this.retryLoginInterval);
    clearInterval(this.tokenRenwalInterval);
  }

}

module.exports = MyDevice;
