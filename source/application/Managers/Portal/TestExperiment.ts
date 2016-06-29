import CockpitPortal = require("Managers/Portal/Cockpit");

class TestExperiment
{
	public Slides:CockpitPortal.IQuestion[][];

	constructor()
	{
		this.Slides = [[this.CreateAudioInformationRetrieval()]];
	}

	public CreateAudioInformationRetrieval():CockpitPortal.IQuestion
	{
		return this.CreateStandardQuestion("AudioInformationRetrieval", {
			"SearchView": {
				"Enabled": true,
				"Header": {
					"Label": "Enter you custom query"
				},
				"Button": {
					"Label": "Search"
				}
			},
			"ItemListView": {

			},
			"PlayerView": {

			},
			"Data": {
				"MetadataSchemas": {
					"MetadataSchema": []
				},
				"Items":{
					"Item": []
				}
			}
		});
	}

	public CreateStandardQuestion(type:string, instruments:any, events:any = null):CockpitPortal.IQuestion
	{
		return this.CreateQuestion(new Date().getTime().toString(), type, [
			{"Events": events},
			{"Instruments": instruments}
		]);
	}

	public CreateQuestion(id: string, type:string, input:any[]):CockpitPortal.IQuestion
	{
		return {
			Id: id,
			Type: type,
			Input: input,
			Output: {Events: []}
		}
	}
}

export = TestExperiment;