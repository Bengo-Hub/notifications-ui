'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappProfileApi, type WhatsAppBusinessProfile, type WhatsAppProfileUpdate } from '@/lib/api/whatsapp';

// Keyed by the connected number, so connecting a different one reads its own profile.
const profileKey = (phoneNumberId?: string) => ['settings', 'current', 'whatsapp-profile', phoneNumberId ?? ''] as const;

/** The business profile of the tenant's own WhatsApp number. Only runs when a number is connected. */
export function useWhatsAppProfile(phoneNumberId?: string) {
    return useQuery({
        queryKey: profileKey(phoneNumberId),
        queryFn: () => whatsappProfileApi.get(),
        enabled: !!phoneNumberId,
        staleTime: 60 * 1000,
        retry: false,
    });
}

function useProfileMutation<TArg, TResult>(phoneNumberId: string | undefined, fn: (arg: TArg) => Promise<TResult>, pick: (r: TResult) => WhatsAppBusinessProfile | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: fn,
        onSuccess: (result) => {
            const p = pick(result);
            // A change answers with the profile as Meta now has it; otherwise read it again.
            if (p && 'phone_number_id' in p) queryClient.setQueryData(profileKey(phoneNumberId), p);
            else queryClient.invalidateQueries({ queryKey: profileKey(phoneNumberId) });
        },
    });
}

export function useUpdateWhatsAppProfile(phoneNumberId?: string) {
    return useProfileMutation(phoneNumberId, (body: WhatsAppProfileUpdate) => whatsappProfileApi.update(body), (r) => r);
}

export function useUploadWhatsAppPhoto(phoneNumberId?: string) {
    return useProfileMutation(phoneNumberId, (file: File) => whatsappProfileApi.uploadPhoto(file), (r) => r);
}

export function useSyncWhatsAppProfileFromBranding(phoneNumberId?: string) {
    return useProfileMutation(phoneNumberId, () => whatsappProfileApi.syncBranding(), (r) => r.profile);
}
