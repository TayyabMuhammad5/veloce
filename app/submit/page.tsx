'use client'

import { useRef, useState } from 'react'
import { submitIntakeForm } from '@/actions/brief'

export default function SubmitPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleAction(formData: FormData) {
    setIsPending(true)
    setMessage('')
    setErrorMsg('') // Clear old errors
    
    const result = await submitIntakeForm(formData)
    setIsPending(false)

    if (result.success) {
      setMessage("Project submitted successfully! Our AI is analyzing it now.")
      formRef.current?.reset()
    } else {
      console.log("RESULT:", result.error)
      // Display the actual error message returned from Zod or the Server Action!
      setErrorMsg(result.error || "Something went wrong. Please try again.")
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Start a Project</h1>
      
      {/* Success Message */}
      {message && (
        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-md font-medium">
          {message}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-md font-medium">
          {errorMsg}
        </div>
      )}

      <form ref={formRef} action={handleAction} className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-1">Project Title</label>
          <input required name="title" type="text" className="w-full border rounded-md p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Project Description</label>
          <textarea required name="description" rows={5} className="w-full border rounded-md p-2" placeholder="Tell us about your requirements... (min 20 chars)"></textarea>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Budget Range</label>
            <select name="budget" className="w-full border rounded-md p-2">
              <option value="$5k - $10k">$5k - $10k</option>
              <option value="$10k - $25k">$10k - $25k</option>
              <option value="$25k+">$25k+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Urgency</label>
            <select name="urgency" className="w-full border rounded-md p-2">
              {/* FIXED: Values are now ALL CAPS to match the Zod Schema perfectly */}
              <option value="LOW">Low (Flexible)</option>
              <option value="MEDIUM">Medium (1-3 Months)</option>
              <option value="HIGH">High (ASAP)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input required name="contactInfo" type="email" className="w-full border rounded-md p-2" />
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-bold transition"
        >
          {isPending ? 'Submitting...' : 'Submit Brief'}
        </button>
      </form>
    </div>
  )
}