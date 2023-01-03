// Import our custom CSS
import './Main.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';

import jQuery from 'jquery';
window.jQuery = jQuery;
window.$ = jQuery;

//import * as bootstrap from 'bootstrap';

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
import Freetext = require('Components/Questions/Freetext/Freetext');
import FreetextHash = require('Components/Questions/FreetextHash/FreetextHash');
import KAcPS = require('Components/Questions/KAcPS/KAcPS');
import Monitor = require('Components/Questions/Monitor/Monitor');
import OneDScale = require('Components/Questions/OneDScale/OneDScale');
import LikertScale = require('Components/Questions/LikertScale/LikertScale');
import OneDScaleT = require('Components/Questions/OneDScaleT/OneDScaleT');
import SoloStimulus = require('Components/Questions/SoloStimulus/SoloStimulus');
import TaggingA = require('Components/Questions/TaggingA/TaggingA');
import TaggingB = require('Components/Questions/TaggingB/TaggingB');
import TextBlock = require('Components/Questions/TextBlock/TextBlock');
import TwoDScaleK = require('Components/Questions/TwoDScaleK/TwoDScaleK');
import Unsupported = require('Components/Questions/Unsupported/Unsupported');
import WebGazerCalibrate = require('Components/Questions/WebGazerCalibrate/WebGazerCalibrate');

import KnockoutBindings from './KnockoutBindings/KnockoutBindings';

for (const [bindingName, binding] of Object.entries(KnockoutBindings)) {
  knockout.bindingHandlers[bindingName] = binding;
}

knockout.applyBindings({
  declarations: [
    Shell,
    SlideShell,
    Default,
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
    QuestionRadioButtonGroup,
    Freetext,
    FreetextHash,
    KAcPS,
    OneDScale,
    OneDScaleT,
    LikertScale,
    Monitor,
    SoloStimulus,
    TaggingA,
    TaggingB,
    TextBlock,
    TwoDScaleK,
    Unsupported,
    WebGazerCalibrate,
  ],
});
