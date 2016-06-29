import CockpitPortal = require("Managers/Portal/Cockpit");

class TestExperiment
{
	public Slides:CockpitPortal.IQuestion[][];

	constructor()
	{
		this.Slides = [[this.CreateQuestion("TestId", "AudioInformationRetrieval", [{}])]];
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