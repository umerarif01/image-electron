interface TextAreaProps {
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

const TextArea = ({ placeholder, value, onChange }: TextAreaProps) => {
  return (
    <textarea
      className="w-full h-full border border-slate-200 rounded px-4 py-2 text-base"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  )
}

export default TextArea
