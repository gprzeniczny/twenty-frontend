import { getOperationName } from '@apollo/client/utilities';
import { useRecoilState, useRecoilValue } from 'recoil';
import { v4 } from 'uuid';

import { currentUserState } from '@/auth/states/currentUserState';
import { GET_COMPANIES } from '@/companies/graphql/queries/getCompanies';
import { GET_PEOPLE } from '@/people/graphql/queries/getPeople';
import { useRightDrawer } from '@/ui/right-drawer/hooks/useRightDrawer';
import { RightDrawerHotkeyScope } from '@/ui/right-drawer/types/RightDrawerHotkeyScope';
import { RightDrawerPages } from '@/ui/right-drawer/types/RightDrawerPages';
import { useSetHotkeyScope } from '@/ui/utilities/hotkey/hooks/useSetHotkeyScope';
import { ActivityType, useCreateActivityMutation } from '~/generated/graphql';

import { GET_ACTIVITIES } from '../graphql/queries/getActivities';
import { GET_ACTIVITIES_BY_TARGETS } from '../graphql/queries/getActivitiesByTarget';
import { GET_ACTIVITY } from '../graphql/queries/getActivity';
import { activityTargetableEntityArrayState } from '../states/activityTargetableEntityArrayState';
import { viewableActivityIdState } from '../states/viewableActivityIdState';
import {
  ActivityTargetableEntity,
  ActivityTargetableEntityType,
} from '../types/ActivityTargetableEntity';

export function useOpenCreateActivityDrawer() {
  const { openRightDrawer } = useRightDrawer();
  const [createActivityMutation] = useCreateActivityMutation();
  const currentUser = useRecoilValue(currentUserState);
  const setHotkeyScope = useSetHotkeyScope();

  const [, setActivityTargetableEntityArray] = useRecoilState(
    activityTargetableEntityArrayState,
  );
  const [, setViewableActivityId] = useRecoilState(viewableActivityIdState);

  return function openCreateActivityDrawer(
    type: ActivityType,
    entities?: ActivityTargetableEntity[],
  ) {
    const now = new Date().toISOString();
    return createActivityMutation({
      variables: {
        data: {
          id: v4(),
          createdAt: now,
          updatedAt: now,
          author: { connect: { id: currentUser?.id ?? '' } },
          assignee: { connect: { id: currentUser?.id ?? '' } },
          type: type,
          activityTargets: {
            createMany: {
              data: entities
                ? entities.map((entity) => ({
                    companyId:
                      entity.type === ActivityTargetableEntityType.Company
                        ? entity.id
                        : null,
                    personId:
                      entity.type === ActivityTargetableEntityType.Person
                        ? entity.id
                        : null,
                    id: v4(),
                    createdAt: now,
                  }))
                : [],
              skipDuplicates: true,
            },
          },
        },
      },
      refetchQueries: [
        getOperationName(GET_COMPANIES) ?? '',
        getOperationName(GET_PEOPLE) ?? '',
        getOperationName(GET_ACTIVITY) ?? '',
        getOperationName(GET_ACTIVITIES_BY_TARGETS) ?? '',
        getOperationName(GET_ACTIVITIES) ?? '',
      ],
      onCompleted(data) {
        setHotkeyScope(RightDrawerHotkeyScope.RightDrawer, { goto: false });
        setViewableActivityId(data.createOneActivity.id);
        setActivityTargetableEntityArray(entities ?? []);
        openRightDrawer(RightDrawerPages.CreateActivity);
      },
    });
  };
}
