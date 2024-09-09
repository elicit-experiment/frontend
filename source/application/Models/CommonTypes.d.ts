interface IStimulus {
  Type: string;
  Label: string;
  URI: string;
  IsPausable: boolean;
  IsReplayable: boolean;
  IsOptional: number;
  MaxReplayCount: number;
  Width: string;
  Height: string;
}
