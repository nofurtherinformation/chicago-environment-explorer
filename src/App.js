import React, { Suspense  } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import {Home, LoadingMessage, ErrorPage} from './components/';
import { ThemeProvider, StyledEngineProvider, createTheme } from '@mui/material/styles';

// import makeStyles from '@mui/styles/makeStyles';

const theme = createTheme();

// const useStyles = makeStyles((theme) => {
//   root: {
//     // some CSS that access to theme
//   }
// });

const Map = React.lazy(() => import('./components/Pages/Map'));
const About = React.lazy(() => import('./components/Pages/About'));
const Guide = React.lazy(() => import('./components/Pages/Guide'));
const Contact = React.lazy(() => import('./components/Pages/Contact'));
const Community = React.lazy(() => import('./components/Pages/Community'));
const Data = React.lazy(() => import('./components/Pages/Data'));
const IndexBuilder = React.lazy(() => import('./components/Pages/IndexBuilder'));

export default function App() {

    return (
      <Router basename={process.env.PUBLIC_URL}>
      <div>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <Suspense fallback={<LoadingMessage />}>
              <Switch>
                <Route path="/" component={Home} exact/>
                <Route path="/map" component={Map}/>
                <Route path="/map.html" component={Map}/>
                <Route path="/about" component={About}/>
                <Route path="/about.html" component={About}/>
                <Route path="/guide" component={Guide}/>
                <Route path="/guide.html" component={Guide}/>
                <Route path="/contact" component={Contact}/>
                <Route path="/contact.html" component={Contact}/>
                <Route path="/community" component={Community}/>
                <Route path="/community.html" component={Community}/>
                <Route path="/data" component={Data}/>
                <Route path="/data.html" component={Data}/>
                <Route path="/builder" component={IndexBuilder} />
                <Route path="/builder.html" component={IndexBuilder} />
                <Route component={ErrorPage} />
                <Route />
            </Switch>
          </Suspense>
          </ThemeProvider>
      </StyledEngineProvider>
      </div>
    </Router>
    );
}
