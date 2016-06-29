import knockout = require("knockout");
import QuestionBase = require("Components/Questions/QuestionBase");
import QuestionModel = require("Models/Question");
import AudioInfo = require("Components/Players/Audio/AudioInfo");

type Selection = {Identifier:string};

class AudioInformationRetrieval extends QuestionBase<{Selections:Selection[]}>
{
	constructor(question: QuestionModel)
	{
		super(question);
	}
}

export  = AudioInformationRetrieval;