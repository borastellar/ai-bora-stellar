import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { Analytics } from "@vercel/analytics/react";
import { Home } from "./pages/Home";
import { Services } from "./pages/Services";
import { ProposalPage } from "./pages/Proposal";
import ClientLoginPage from "./pages/ClientLogin";
import PaymentPage from "./pages/Payment";
import VerifyPage from "./pages/Verify";
import RegisterPage from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import ClientPage from "./pages/Client";
import CollaboratorPage from "./pages/Collaborator";
import TasksPage from "./pages/Tasks";
import Academy from "./pages/academia/Academy";

// Load document-export dependencies only when their routes are visited.
const Quote = lazy(() => import("./pages/Quote").then(({ Quote }) => ({ default: Quote })));
const Admin = lazy(() => import("./pages/Admin").then(({ Admin }) => ({ default: Admin })));

export default function App() {
  return (
    <>
      <Suspense fallback={<div role="status">Loading…</div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/services" component={Services} />
        <Route path="/servicos" component={Services} />
        <Route path="/quote" component={Quote} />
        <Route path="/admin/quote" component={Quote} />
        <Route path="/proposal/:id" component={ProposalPage} />
        <Route path="/verify/:hash" component={VerifyPage} />
        <Route path="/client/login/:token" component={ClientLoginPage} />
        <Route path="/client/login" component={ClientLoginPage} />
        <Route path="/client/:id" component={ClientPage} />
        <Route path="/c/:id" component={ClientPage} />
        <Route path="/client" component={ClientPage} />
        <Route path="/tasks/:id" component={TasksPage} />
        <Route path="/payment/:id" component={PaymentPage} />
        <Route path="/collaborator/:id" component={CollaboratorPage} />
        <Route path="/admin" component={Admin} />
        <Route path="/academy" component={Academy} />
        <Route>
          <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f8f7f4',fontFamily:'Montserrat,sans-serif'}}>
            <div style={{textAlign:'center'}}>
              <h1 style={{fontSize:72,fontWeight:900,color:'#1b1c1b',margin:0}}>404</h1>
              <p style={{fontSize:18,color:'#666',margin:'16px 0 32px'}}>Page not found</p>
              <a href="/" style={{color:'#F25C05',fontWeight:700,textDecoration:'none'}}>Back to home →</a>
            </div>
          </div>
        </Route>
      </Switch>
      </Suspense>
      <Analytics />
    </>
  );
}