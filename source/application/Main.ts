// Import our custom CSS
import './Main.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';

import * as jQuery from 'jquery';
window.jQuery = jQuery;
window.$ = jQuery;

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

import QuestionRadioButtonGroup from 'Components/Questions/RadioButtonGroup/RadioButtonGroup';
import AudioInformationRetrieval from 'Components/Questions/AudioInformationRetrieval/AudioInformationRetrieval';
import CheckBoxGroup from 'Components/Questions/CheckBoxGroup/CheckBoxGroup';
import CompletionCode from 'Components/Questions/CompletionCode/CompletionCode';
import ContinousScale2D from 'Components/Questions/ContinousScale2D/ContinousScale2D';
import EndOfExperiment from 'Components/Questions/EndOfExperiment/EndOfExperiment';
import Freetext from 'Components/Questions/Freetext/Freetext';
import FreetextHash from 'Components/Questions/FreetextHash/FreetextHash';
import KAcPS from 'Components/Questions/KAcPS/KAcPS';
import Monitor from 'Components/Questions/Monitor/Monitor';
import Header from 'Components/Questions/Header/Header';
import OneDScale from 'Components/Questions/OneDScale/OneDScale';
import LikertScale from 'Components/Questions/LikertScale/LikertScale';
import OneDScaleT from 'Components/Questions/OneDScaleT/OneDScaleT';
import SoloStimulus from 'Components/Questions/SoloStimulus/SoloStimulus';
import ListSelect from 'Components/Questions/ListSelect/ListSelect';
import TaggingA from 'Components/Questions/TaggingA/TaggingA';
import TaggingB from 'Components/Questions/TaggingB/TaggingB';
import TextBlock from 'Components/Questions/TextBlock/TextBlock';
import TwoDScaleK from 'Components/Questions/TwoDScaleK/TwoDScaleK';
import Unsupported from 'Components/Questions/Unsupported/Unsupported';
import WebGazerCalibrate from 'Components/Questions/WebGazerCalibrate/WebGazerCalibrate';
import FaceLandmarkCalibration from './Components/Questions/FaceLandmarkCalibration/FaceLandmarkCalibration';

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
    Header,
    Freetext,
    FreetextHash,
    KAcPS,
    OneDScale,
    OneDScaleT,
    LikertScale,
    Monitor,
    SoloStimulus,
    ListSelect,
    TaggingA,
    TaggingB,
    TextBlock,
    TwoDScaleK,
    Unsupported,
    WebGazerCalibrate,
    FaceLandmarkCalibration,
  ],
});
