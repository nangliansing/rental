import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query"

type CreateModerationRecordOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>
  queryKey: QueryKey
  scopeId: string
}

export function useCreateModerationRecord<TData, TVariables>({
  mutationFn,
  queryKey,
  scopeId,
}: CreateModerationRecordOptions<TData, TVariables>) {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: scopeId },
    mutationFn,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
    },
    onSettled: async (_data, error) => {
      if (error) return

      await queryClient.invalidateQueries({
        queryKey,
        refetchType: "active",
      })
    },
  })
}
