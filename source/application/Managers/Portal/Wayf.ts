import PortalClient = require('PortalClient');
import Notification = require('Managers/Notification');
import Configuration = require('Managers/Configuration');
import IServiceCaller = CHAOS.Portal.Client.IServiceCaller;

class Wayf {
  private GetParameterByName(name: string, query: string) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
      results = regex.exec(query);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  }

  public Login(callback: (success: boolean, notApproved: boolean) => void, serviceCaller?: IServiceCaller): void {
    const callbackUrl = window.location.protocol + '//' + window.location.host + '/WayfCallback.html';
    const wayfInfo = PortalClient.Wayf.LogIn(Configuration.WayfPath, callbackUrl, serviceCaller);
    const listener = (event: any) => {
      if (event.originalEvent.key === 'WayfStatus') {
        $(window).off('storage', listener);

        const status = parseInt(this.GetParameterByName('status', event.originalEvent.newValue));
        const message = this.GetParameterByName('message', event.originalEvent.newValue);

        wayfInfo.Callback(status);

        switch (status) {
          case 0: //Success
            callback(true, false);
            break;
          case 1: //Failed
          case 3:
            Notification.Error('Wayf login failed: ' + message);
            callback(false, false);
            break;
          case 2: //Not approved
            callback(false, true);
            break;
        }
      }
    };

    $(window).on('storage', listener);

    window.open(wayfInfo.Path, 'WayfLogin', 'width=800,height=800,menubar=no,status=no,toolbar=no,resizable=yes');
  }
}

const instance = new Wayf();

export = instance;
