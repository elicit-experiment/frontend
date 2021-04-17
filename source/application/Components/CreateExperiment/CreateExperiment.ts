import knockout = require('knockout');
import CockpitPortal = require('Managers/Portal/Cockpit');
import Portal = require('Managers/Portal/Portal');
import PortalClient = require('PortalClient');
import DisposableComponent = require('Components/DisposableComponent');

class CreateExperiment extends DisposableComponent {
  public IsAuthenticated: KnockoutObservable<boolean>;
  public Email = knockout.observable('');
  public Password = knockout.observable('');

  public FolderId = knockout.observable(99999775);
  public ExperimentXml = knockout.observable('');
  public ObjectGuid = knockout.observable('');
  public Result = knockout.observable('');

  public ObjectTypeId = 775;
  public MetadataSchemaGuid = 'ffffffff-ffff-ffff-ffff-fff775000001';

  constructor() {
    super();

    this.IsAuthenticated = Portal.IsAuthenticated;
  }

  public Login(): void {
    PortalClient.EmailPassword.Login(this.Email(), this.Password());
  }

  public Load(): void {
    PortalClient.Object.Get([this.ObjectGuid()], null, true, true, true, true, true).WithCallback((results) => {
      this.ExperimentXml(results.Body.Results[0].Metadatas[0].MetadataXml);
      this.Result(JSON.stringify(results.Body.Results[0]));
    });
  }

  public CreateExperiment(): void {
    let revisionId = 0;
    const saver = () => {
      PortalClient.Metadata.Set(
        this.ObjectGuid(),
        this.MetadataSchemaGuid,
        null,
        revisionId,
        this.ExperimentXml(),
      ).WithCallback((results) => {
        this.Result(JSON.stringify(results.Body.Results[0]));
      });
    };

    if (this.ObjectGuid() == '') {
      PortalClient.Object.Create(null, this.ObjectTypeId, this.FolderId()).WithCallback((results) => {
        this.ObjectGuid(results.Body.Results[0].Guid);
        this.Result(JSON.stringify(results.Body.Results[0]));

        saver();
      });
    } else {
      PortalClient.Object.Get([this.ObjectGuid()], null, true).WithCallback((results) => {
        revisionId = results.Body.Results[0].Metadatas[0].RevisionID;
        saver();
      });
    }
  }
}

export = CreateExperiment;
