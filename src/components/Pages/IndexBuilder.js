import React, {useState} from 'react';
import {useHistory} from "react-router-dom";

import Grid from "@mui/material/Grid";

import IndicatorsList from "../IndexBuilder/Indicators";
import IndicatorDetails from "../IndexBuilder/IndicatorDetails";
import IndexBuilderFooter from "../IndexBuilder/IndexBuilderFooter";
import {WeightsSliders, WeightsPieChart} from "../IndexBuilder/Weights";
import {IndicatorsHelperText, WeightsHelperText} from "../IndexBuilder/HelperText";
import SummaryMapPage, {FloatingPanel} from '../IndexBuilder/SummaryAndMap';

import {colors} from "../../config";
import {FaArrowCircleLeft} from "@react-icons/all-files/fa/FaArrowCircleLeft";
import styled from "styled-components";

// TODO: Convert style={{ }} to styled-components

const HeaderText = styled.h1`
  font-family: Lora, sans-serif !important;
  font-weight: 200;
  margin-bottom: 5px;
  margin-left: 5px;
  font-size: 32px !important;
`;

/** Paged wizard-like component to present indicators for selection + allow user to set the weights */
export default function IndexBuilder() {
    const history = useHistory();

    /** for example, see components/IndexBuilder/IndicatorsStep */
    const [steps] = useState(['indicators', 'weights', 'summary']);
    const [currentStep, setCurrentStep] = useState(steps[0]);

    // User's last-clicked tooltip icon
    const [selectedDetails, setSelectedDetails] = useState(undefined);

    // User's indicator/variable selections
    // TODO: Default selections?
    const [selections, setSelections] = useState([]);

    return (
        <>
            { /*<NavBar showMapControls={true} bounds={defaultBounds} />*/ }

            <Grid container spacing={2} style={{ marginTop:'4vh', marginBottom:'10vh', paddingLeft: '15vw', paddingRight: '15vw' }}>
                <Grid item xs={6}>
                    {
                        currentStep === 'indicators' && !selectedDetails && <>
                            <HeaderText>
                                <FaArrowCircleLeft onClick={() => history.push("/map")} style={{ verticalAlign: 'middle', marginRight: '1rem', color: colors.forest, cursor: 'pointer' }} />
                                1. Select Indicators
                            </HeaderText>
                            <div style={{ paddingLeft: '3rem' }}>
                                <IndicatorsHelperText />
                            </div>
                        </>

                    }
                    {
                        currentStep === 'weights' && !selectedDetails && <>
                            <HeaderText>
                                <FaArrowCircleLeft onClick={() => setCurrentStep('indicators')} style={{ verticalAlign: 'middle', marginRight: '1rem', color: colors.forest, cursor: 'pointer' }} />
                                2. Choose Weights
                            </HeaderText>
                            <div style={{ paddingLeft: '3rem' }}>
                                <WeightsHelperText />
                            </div>
                        </>
                    }
                    {
                        !!selectedDetails && <>
                            <IndicatorDetails selectedDetails={selectedDetails}
                                              setSelectedDetails={setSelectedDetails} />
                            {
                                currentStep === 'weights' && <WeightsPieChart selections={selections}
                                                                              width={500}
                                                                              height={300} />
                            }
                        </>
                    }
                </Grid>
                <Grid item xs style={{ paddingTop: '8vh' }}>
                    {
                        currentStep === 'indicators' && <>
                            <IndicatorsList selections={selections}
                                            setSelections={setSelections}
                                            setCurrentStep={setCurrentStep}
                                            setSelectedDetails={setSelectedDetails} />
                        </>
                    }
                    {
                        currentStep === 'weights' && <>
                            <WeightsPieChart selections={selections} width={650} height={200} cx={250} />

                            <WeightsSliders selections={selections}
                                            setSelections={setSelections}
                                            setSelectedDetails={setSelectedDetails} />
                        </>
                    }
                </Grid>
            </Grid>

            {
                currentStep === 'summary' && <>
                    <FloatingPanel style={{ top: '25px', left: '20px' }}>
                        <HeaderText style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                            <FaArrowCircleLeft onClick={() => setCurrentStep('weights')} style={{ verticalAlign: 'middle', marginRight: '1rem', color: colors.forest, cursor: 'pointer' }} />
                            3. Summary & Map
                        </HeaderText>
                    </FloatingPanel>

                    <SummaryMapPage selections={selections}></SummaryMapPage>
                </>
            }
            {
                currentStep !== 'summary' && <IndexBuilderFooter canNext={currentStep !== 'summary' && selections.length > 0}
                                                                 currentStep={currentStep}
                                                                 setCurrentStep={setCurrentStep}
                                                                 setSelections={setSelections}
                                                                 setSelectedDetails={setSelectedDetails} />
            }
        </>
    );
};

