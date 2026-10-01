import './Footer.css'

type Props = { version: string; updated: string; reportEmail: string }

export const Footer = ({ version, updated, reportEmail }: Props) => (
  <footer className="page-footer">
    <p>{`Data version ${version} · Updated ${updated}`}</p>
    <p>Website made by Shona</p>
    {reportEmail === '' ? null : (
      <p>
        Report a dose problem:{' '}
        <a href={`mailto:${reportEmail}?subject=${encodeURIComponent('Dose problem report')}`}>{reportEmail}</a>
      </p>
    )}
  </footer>
)
