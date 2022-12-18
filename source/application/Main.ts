// Import our custom CSS
import './Main.scss';
import * as bootstrap from 'bootstrap';

import 'promise-polyfill';
import 'whatwg-fetch';
import * as knockout from 'knockout';

import Shell from 'Components/Shell/Shell';
import SlideShell from 'Components/SlideShell/SlideShell';
import CreateExperiment from 'Components/CreateExperiment/CreateExperiment';
import ExperimentNotFound from 'Components/ExperimentNotFound/ExperimentNotFound';
import NoMoreExperiments from 'Components/NoMoreExperiments/NoMoreExperiments';
import NotFound from 'Components/NotFound/NotFound';
import TextFormat from 'Components/TextFormat/TextFormat';
import Welcome from 'Components/Welcome/Welcome';
import SlideLocked from 'Components/SlideLocked/SlideLocked';

import Default from 'Components/Slides/Default/Default';

import Audio from 'Components/Players/Audio/Audio';
import Image from 'Components/Players/Image/Image';
import Video from 'Components/Players/Video/Video';

import QuestionRadioButtonGroup = require('Components/Questions/RadioButtonGroup/RadioButtonGroup');
import AudioInformationRetrieval = require('Components/Questions/AudioInformationRetrieval/AudioInformationRetrieval');
import CheckBoxGroup = require('Components/Questions/CheckBoxGroup/CheckBoxGroup');
import CompletionCode = require('Components/Questions/CompletionCode/CompletionCode');
import ContinousScale2D = require('Components/Questions/ContinousScale2D/ContinousScale2D');
import EndOfExperiment = require('Components/Questions/EndOfExperiment/EndOfExperiment');

import KnockoutBindings from './KnockoutBindings/KnockoutBindings';

//knockout.components.loaders.push(new NameConventionLoader());
knockout.applyBindings({
  declarations: [
    Shell,
    SlideShell,
    Default,
    QuestionRadioButtonGroup,
    CreateExperiment,
    ExperimentNotFound,
    NoMoreExperiments,
    NotFound,
    SlideLocked,
    TextFormat,
    Welcome,

    //  Players
    Audio,
    Image,
    Video,

    // Questions
    AudioInformationRetrieval,
    CheckBoxGroup,
    CompletionCode,
    ContinousScale2D,
    EndOfExperiment,
  ],
});
