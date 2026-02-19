
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

async function ensureProfile(user) {
    // Get display name from user metadata — Google uses full_name, manual signup uses display_name
    const metaName = user.user_metadata?.full_name || user.user_metadata?.display_name || null
    console.log('[Profile] Ensuring profile for', user.id, '| meta name:', metaName)

    // Check if profile row exists
    const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', user.id)
        .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = "no rows returned" — that's expected for new users
        console.error('[Profile] Error fetching profile:', fetchError.message)
        return metaName
    }

    if (!existing) {
        // No profile row — insert one
        console.log('[Profile] No profile found, inserting new row...')
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({ id: user.id, display_name: metaName })
        if (insertError) {
            console.error('[Profile] Insert error:', insertError.message)
        } else {
            console.log('[Profile] Profile created with display_name:', metaName)
        }
        return metaName
    }

    if (existing.display_name) {
        // Profile exists with a display name — use it
        console.log('[Profile] Existing display_name:', existing.display_name)
        return existing.display_name
    }

    // Profile exists but display_name is null — update it from metadata
    if (metaName) {
        console.log('[Profile] display_name is null, updating with:', metaName)
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ display_name: metaName })
            .eq('id', user.id)
        if (updateError) {
            console.error('[Profile] Update error:', updateError.message)
        }
    }
    return metaName
}

export default function ProtectedRoute() {
    const [session, setSession] = useState(null)
    const [displayName, setDisplayName] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user) {
                ensureProfile(session.user).then(name => setDisplayName(name))
            }
            setLoading(false)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session)
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('[Auth] SIGNED_IN event — ensuring profile...')
                ensureProfile(session.user).then(name => setDisplayName(name))
            }
            if (event === 'SIGNED_OUT') {
                setDisplayName(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    if (loading) {
        return <div>Loading...</div>
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    return <Outlet context={{ displayName }} />
}
