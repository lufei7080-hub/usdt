import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

const LegalPage = ({ type }) => {
  const { t } = useLanguage();
  const isTerms = type === 'terms';
  const title = isTerms ? t.footer.terms : t.footer.privacy;
  const body = isTerms ? t.footer.termsBody : t.footer.privacyBody;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 pt-24">
      <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm">
        ← {t.navbar.home}
      </Link>
      <h1 className="text-3xl font-bold mt-6 mb-6">{title}</h1>
      <div className="text-gray-400 leading-relaxed whitespace-pre-wrap space-y-4">
        {body}
      </div>
    </div>
  );
};

export default LegalPage;
