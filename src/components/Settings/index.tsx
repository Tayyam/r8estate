@@ .. @@
 import { LanguageProvider } from '../contexts/LanguageContext';
 import { NotificationProvider } from '../contexts/NotificationContext';
 import Header from './Header';
-import Hero from './Hero';
-import Categories from './Categories';
-import About from './About';
-import Pricing from './Pricing';
-import Contact from './Contact';
-import Terms from './Terms';
-import Privacy from './Privacy';
-import Settings from './Settings';
-import Login from './Auth/Login';
-import Register from './Auth/Register';
-import CompanyProfile from './CompanyProfile';
-import PersonalProfile from './PersonalProfile';
-import MyReviews from './MyReviews';
-import SearchResults from './SearchResults';
-import Footer from './Footer';
-import NotificationContainer from './UI/NotificationContainer';
-import { getCompanySlug } from './utils/urlUtils';
-import { useAuth } from './contexts/AuthContext';
-import SuspendedUserView from './SuspendedUserView';
+import Hero from '../components/Hero';
+import Categories from '../components/Categories';
+import About from '../components/About';
+import Pricing from '../components/Pricing';
+import Contact from '../components/Contact';
+import Terms from '../components/Terms';
+import Privacy from '../components/Privacy';
+import Settings from '../components/Settings';
+import Login from '../components/Auth/Login';
+import Register from '../components/Auth/Register';
+import CompanyProfile from '../components/CompanyProfile';
+import Person
@@ .. @@
 import UserManagement from './UserManagement';
 import Companies from './Companies';
 import Categories from './Categories';
-import ClaimRequests from './ClaimRequests';
+import ClaimRequests from './ClaimRequests'; 
+import Reports from './Reports';
+import { Flag } from 'lucide-react';
 
 interface SettingsProps {
@@ .. @@
       id: 'claims',
       name: translations?.claimRequests || 'Claim Requests',
       icon: FileText,
-      component: ClaimRequests
+      component: ClaimRequests  
+    },
+    {
+      id: 'reports',
+      name: translations?.reportsManagement || 'Reports Management',
+      icon: Flag,
+      component: Reports
     }
   ];