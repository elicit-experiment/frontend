import PortalClient from 'PortalClient';
import Configuration from 'Managers/Configuration';

export class Experiment {
  public static Get(
    id: string,
    serviceCaller: CHAOS.Portal.Client.IServiceCaller = null,
  ): CHAOS.Portal.Client.ICallState<CockpitResults<IExperiment>> {
    if (serviceCaller == null) serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    return serviceCaller.CallService('Experiment/Get', PortalClient.HttpMethod.Get, { id: id }, true);
  }

  public static Next(
    listId: string,
    serviceCaller: CHAOS.Portal.Client.IServiceCaller = null,
  ): CHAOS.Portal.Client.ICallState<CockpitResults<IExperimentClaim>> {
    if (serviceCaller == null) serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    return serviceCaller.CallService('Experiment/Next', PortalClient.HttpMethod.Get, { listId: listId }, true);
  }
}

export class Slide {
  public static Completed(
    questionaireId: string,
    slideIndex: number,
    serviceCaller: CHAOS.Portal.Client.IServiceCaller = null,
  ): CHAOS.Portal.Client.ICallState<CockpitResults<any>> {
    if (serviceCaller == null) serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    return serviceCaller.CallService(
      'Slide/Completed',
      PortalClient.HttpMethod.Get,
      { questionaireId: questionaireId, slideIndex: slideIndex },
      true,
    );
  }
  public static DataPoint(
    questionaireId: string,
    dataPoint: any,
    serviceCaller: CHAOS.Portal.Client.IServiceCaller = null,
  ): CHAOS.Portal.Client.ICallState<CockpitResults<any>> {
    if (serviceCaller == null) serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    const parameters =
      questionaireId == 'mouse'
        ? { seriesType: 'mouse', data: JSON.stringify(dataPoint) }
        : { questionaireId: questionaireId, content: JSON.stringify(dataPoint) };
    return serviceCaller.CallService('Slide/DataPoint', PortalClient.HttpMethod.Post, parameters, true, 'json2');
  }
}

export class Question {
  public static Get(
    id: string,
    index: number,
    serviceCaller: CHAOS.Portal.Client.IServiceCaller = null,
  ): CHAOS.Portal.Client.ICallState<CockpitResults<IQuestion>> {
    if (serviceCaller == null) serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    return serviceCaller.CallService(
      'Question/Get',
      PortalClient.HttpMethod.Get,
      { id: id, index: index },
      true,
      'json3',
    );
  }
}

export class Answer {
  public static Set(
    questionId: string,
    output: any,
    serviceCaller: CHAOS.Portal.Client.IServiceCaller = null,
  ): CHAOS.Portal.Client.ICallState<CHAOS.Portal.Client.IPagedPortalResult<any>> {
    if (serviceCaller == null) serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    return serviceCaller.CallService(
      'Answer/Set',
      PortalClient.HttpMethod.Post,
      { questionId: questionId, output: JSON.stringify(output) },
      true,
    );
  }
}

export class AudioInformation {
  public static Search(
    serviceCaller: CHAOS.Portal.Client.IServiceCaller = null,
  ): CHAOS.Portal.Client.ICallState<CHAOS.Portal.Client.IPagedPortalResult<any>> {
    if (serviceCaller == null) serviceCaller = PortalClient.ServiceCallerService.GetDefaultCaller();

    return serviceCaller.CallService('AudioInformation/Search', PortalClient.HttpMethod.Get, null, true);
  }
}

export interface IExperiment {
  Id: string;
  Name: string;
  FooterLabel: string;
  Css: string;
  Version: string;
  LockQuestion: boolean;
  EnablePrevious: boolean;
  CurrentSlideIndex: number;
  RedirectOnCloseUrl: string;
}

export interface IExperimentClaim {
  Id: string;
  ClaimedOnDate: string;
}

export interface CockpitResults<T> {
  Count: number;
  FoundCount: number;
  StartIndex: number;
  Results: T[];
}

export interface IQuestion {
  Id: string;
  Type: string;
  Input: any[];
  Component: any[];
  Output: IOutput;
}

export interface IOutput {
  Events: IQuestionEvent[];
}

export interface IQuestionEvent {
  Id: string;
  Type: string;
  EntityType: string;
  Method: string;
  Data: string;
  DateTime: Date;
}
