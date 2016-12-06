import CockpitPortal = require("Managers/Portal/Cockpit");

class TestExperiment
{
	public Slides:CockpitPortal.IQuestion[][];

	constructor()
	{
		//this.Slides = [[this.CreateAudioInformationRetrieval()]];
		this.Slides = [[this.CreateTaggingA()]];
	}

	public CreateTaggingA():CockpitPortal.IQuestion
	{
		return this.CreateStandardQuestion("TaggingA", {
			"HeaderLabel": "Tag that thing",
			"SelectionTagBoxLabel": "Selection Tags",
			"UserTagBoxLabel": "User Tags",
			"TextField": "Add your tags",
			"SelectionTags": [1, 2, 3, 4, 5, 6, 7, 8].map(i => this.CreateTag(i.toString(), "Tag " + i, i)),
			"UserTags": [1, 2, 3, 4, 5].map(i => this.CreateTag(i.toString(), "User Tag " + i, i)),
			"Stimulus": {
				"Type": "audio/mpeg",
				"URI": "https://s3.eu-central-1.amazonaws.com/762431201790b41bb9c979968535da52/system/140_item/resource/20151023/A4_wind10_S3.wav"
			}
		});
	}

	private CreateTag(id:string, label:string, position:number): {Id:string, Label:string, Position:number}
	{
		return {
			Id: id,
			Label: label,
			Position: position
		};
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
			{"Instrument": instruments}
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