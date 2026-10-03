import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="py-24 text-center">
    <h1 className="text-4xl font-bold text-slate-300">404</h1>
    <p className="mt-2 text-slate-500">That page does not exist.</p>
    <Link to="/" className="btn-primary mt-6 inline-flex">Back to dashboard</Link>
  </div>
);

export default NotFound;
