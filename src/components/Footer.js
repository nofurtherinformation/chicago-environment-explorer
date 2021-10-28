import React from 'react';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';

import { colors } from '../config';


const FooterContainer = styled.footer`
    width:100%;
    background: ${colors.chicagoBlue};
    p {
        color:${colors.black};
        font-size:1rem;
    }
    h6 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size:1rem;
        font-weight: 600;
        font-stretch: normal;
        font-style: normal;
        line-height: normal;
        letter-spacing: normal;
        color: ${colors.black};
    }
    a {
        text-decoration:none;
        color:${colors.black};
        opacity:0.8;
        &:hover {
            opacity:1;
        }
    }   
    img {
        margin-bottom:10px;
        @media (max-width: 960px) {
            max-width:50%;
            display:block;
            margin:40px auto;
        }
    }
    img.logo {
        margin:0 auto;
        display:block;
    }
    hr.footerHr {
        margin:20px 0;
    }
`
const FooterContent = styled.div`
    width:100%;
    max-width:1140px;
    margin:0 auto;
`

const LinkLists = styled(Grid)`
    width:100%;
    padding:50px;
    ul {
        list-style:none;
        li {
            line-height:1.5;
            color:${colors.darkgray};
            font-weight:bold;
        }
    }
    h6.copyright {
        text-align:center;
        font-size:1.5rem;
        font-family:'Lora', serif;
        padding:0 0 2rem 0;
        color:${colors.darkgray};
        font-weight:bold;
    }
    @media (max-width: 960px) {
        text-align:center;
    }
    
`

const SignupForm = styled.div`
    max-width:800px;
    margin:0 auto;
    padding:40px;
    text-align:center;
    h1.signup {
        width:100%;
        font-size:2rem;
    }
    h2 {
        color: ${colors.lightgray};
        font-size:1.25rem;
        font-weight:200;
    }
    form {
        max-width:600px;
        margin:0 auto;
    }
    .MuiOutlinedInput-root {
        display:inline-block;
        background:white;
        width:100%;
    }
    .SubmitEmailBox {
        width:100%;
        height:100%;
        display:inline-block;
        background-color: ${colors.orange};
        color: #0d0d0d;
        border:none;
        outline:none;
        // border-radius:5px;
        font-weight:bold;
        font-family:'Roboto', sans-serif;
        cursor:pointer;
    }
    .sr-only {
        visibility: hidden;
    }
`

const Footer = ( props ) => {
    return (
        <FooterContainer>
            <FooterContent>
                {props.signUp && 
                    <SignupForm>
                        <h1 className="signup">Sign up for the Newsletter</h1>                    
                        <h2>We'll keep you up to date with new updates, features, and insights on the COVID-19 pandemic. Follow the US COVID Atlas team on Medium too.</h2>
            
                        <form action="https://github.us10.list-manage.com/subscribe/post?u=5ed730d26727290870ec65153&amp;id=74f209d5ed" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" class="validate form-inline vertical-center" target="_blank" novalidate="">
                            <label class="sr-only" for="inlineFormInputGroupUsername2">Email</label>                            
                            <Grid container spacing={1}>
                                                                
                                {/* <input type="email" class="form-control EnterEmailBox" name="b_5ed730d26727290870ec65153_74f209d5ed" placeholder="Enter email address" /> */}
                                <Grid item xs={8} sm={10}>
                                    <TextField id="outlined-basic" variant="outlined" type="email" class="form-control EnterEmailBox" name="b_5ed730d26727290870ec65153_74f209d5ed" placeholder="Enter email address"/>
                                </Grid>
                                <Grid item xs={4} sm={2}>
                                    <input type="submit" value="SUBSCRIBE" name="subscribe" id="mc-embedded-subscribe" class="btn btn-lg SubmitEmailBox" />
                                </Grid>
                            </Grid>
                        </form>
                    </SignupForm>
                    }
                    
                {props.signUp && <hr className="footerHr" />}
                <LinkLists container spacing={1}>
                    {/* <Grid item xs={6} md={3}>
                        <p>
                            <ul>
                                <li><NavLink to="/map">Explore</NavLink></li>
                                <li><NavLink to="/data">Data</NavLink></li>
                            </ul>
                        </p>
                    </Grid>
                    <Grid item xs={6} md={4}>
                        <p>
                            <ul>
                                <li><NavLink to="/about">Our Team</NavLink></li>
                                <li><NavLink to="/contact">Contact Us</NavLink></li>
                                <li><a href="https://geodacenter.github.io/" target="_blank" rel="noopener noreferrer">GeoDa Open Software</a></li>
                            </ul>
                        </p>
                    </Grid> */}
                    <Grid item xs={12}>
                        <h6 className="copyright">
                            Brought to you by:
                        </h6>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <a href="https://spatial.uchicago.edu/content/spatial-research-csds" target="_blank" rel="noopener noreferrer">
                            <img className="logo" src={`${process.env.PUBLIC_URL}/csds-university-wordmark-white.png`} width="75%;" alt="Center for Spatial Data Science logo" />
                        </a>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <a href="https://voices.uchicago.edu/herop/" target="_blank" rel="noopener noreferrer">
                            <img className="logo" src={`${process.env.PUBLIC_URL}/herop_light_logo.png`} width="50%;" alt="Center for Spatial Data Science logo" />
                        </a>
                    </Grid>

                    
                </LinkLists>
            </FooterContent>
        </FooterContainer>
    )
}

export default Footer